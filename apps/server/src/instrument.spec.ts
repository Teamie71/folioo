jest.mock('@sentry/nestjs', () => ({
    init: jest.fn(),
    httpIntegration: jest.fn((options: unknown) => options),
}));

// 테스트가 실제 apps/server/.env를 읽지 않도록 기본은 "파일 없음"으로 둔다.
let mockEnvFileExists = false;
jest.mock('node:fs', () => ({
    ...jest.requireActual<typeof import('node:fs')>('node:fs'),
    existsSync: () => mockEnvFileExists,
}));

type RequestEvent = {
    request?: { url?: string; data?: unknown; headers?: Record<string, string> };
};

type InstrumentOptions = {
    enabled: boolean;
    environment: string;
    release: string;
    sampleRate: number;
    beforeSend: (event: RequestEvent) => RequestEvent | null;
    beforeSendTransaction: (event: RequestEvent) => RequestEvent | null;
    beforeSendLog: (log: { level: string; message: string }) => unknown;
    integrations: {
        ignoreIncomingRequests: (urlPath: string) => boolean;
        ignoreOutgoingRequests: (url: string) => boolean;
    }[];
};

const ORIGINAL_ENV = process.env;

/** 주어진 환경변수로 instrument.ts를 새로 불러와 Sentry.init에 넘긴 옵션을 돌려준다. */
function loadOptions(env: Record<string, string | undefined> = {}): InstrumentOptions {
    process.env = { ...ORIGINAL_ENV, ...env };
    let options: InstrumentOptions | undefined;
    jest.isolateModules(() => {
        const Sentry = jest.requireMock<{ init: jest.Mock }>('@sentry/nestjs');
        jest.requireActual('./instrument');
        options = (Sentry.init.mock.calls as unknown[][])[0][0] as InstrumentOptions;
    });
    return options as InstrumentOptions;
}

afterEach(() => {
    process.env = ORIGINAL_ENV;
    mockEnvFileExists = false;
    jest.restoreAllMocks();
});

describe('로컬 .env 로딩', () => {
    it('.env가 있으면 Sentry 설정 전에 먼저 읽는다', () => {
        mockEnvFileExists = true;
        const loadEnvFile = jest.spyOn(process, 'loadEnvFile').mockImplementation(() => {});

        loadOptions();

        expect(loadEnvFile).toHaveBeenCalledWith('.env');
    });

    it('.env가 없으면 (dev/prod 컨테이너) 읽지 않는다', () => {
        const loadEnvFile = jest.spyOn(process, 'loadEnvFile').mockImplementation(() => {});

        loadOptions();

        expect(loadEnvFile).not.toHaveBeenCalled();
    });
});

describe('활성화 스위치', () => {
    it('local은 기본으로 꺼져 있다', () => {
        const options = loadOptions({ APP_PROFILE: 'local', SENTRY_ENABLED: undefined });
        expect(options.enabled).toBe(false);
    });

    it('local에서 SENTRY_ENABLED=true면 켜진다', () => {
        const options = loadOptions({ APP_PROFILE: 'local', SENTRY_ENABLED: 'true' });
        expect(options.enabled).toBe(true);
        expect(options.environment).toBe('local');
    });

    it('dev/prod는 SENTRY_ENABLED와 상관없이 켜진다', () => {
        expect(loadOptions({ APP_PROFILE: 'dev', SENTRY_ENABLED: undefined }).enabled).toBe(true);
        expect(loadOptions({ APP_PROFILE: 'prod', SENTRY_ENABLED: 'false' }).enabled).toBe(true);
    });
});

describe('Kakao callback privacy', () => {
    it('스킬 요청의 에러 이벤트는 남기고, 토큰이 담긴 본문만 지운다', () => {
        const options = loadOptions();
        const event = {
            request: {
                url: 'https://api.test/kakao/skill/chat',
                data: { callbackUrl: 'secret-token' },
            },
        };

        const result = options.beforeSend(event);

        expect(result).not.toBeNull();
        expect(result?.request?.url).toBe('https://api.test/kakao/skill/chat');
        expect(result?.request).not.toHaveProperty('data');
    });

    it('스킬 요청의 트레이스와 카카오 턴 호출은 계속 보내지 않는다', () => {
        const options = loadOptions();
        const event = {
            request: {
                url: 'https://api.test/kakao/skill/chat',
                data: { callbackUrl: 'secret-token' },
            },
        };

        expect(options.beforeSendTransaction(event)).toBeNull();
        expect(options.integrations[0].ignoreIncomingRequests('/kakao/skill/chat')).toBe(true);
        expect(
            options.integrations[0].ignoreOutgoingRequests(
                'https://ai.test/sessions/sid/kakao/turns'
            )
        ).toBe(true);
    });

    it('카카오 이외 요청의 본문은 그대로 둔다', () => {
        const options = loadOptions();
        const event = { request: { url: 'https://api.test/blocks', data: { title: 'a' } } };

        expect(options.beforeSend(event)?.request?.data).toEqual({ title: 'a' });
        expect(options.beforeSendTransaction(event)).toBe(event);
    });
});

describe('요청 헤더 마스킹', () => {
    it('인증 토큰, 내부 API 키, 카카오 스킬 시크릿 헤더를 지운다', () => {
        const options = loadOptions();
        const headers = {
            authorization: 'Bearer jwt',
            'x-api-key': 'internal-key',
            'x-kakao-skill-secret': 'kakao-secret',
            cookie: 'refresh=token',
            'content-type': 'application/json',
            'user-agent': 'jest',
        };

        const errorEvent = options.beforeSend({
            request: { url: 'https://api.test/blocks', headers: { ...headers } },
        });
        const transaction = options.beforeSendTransaction({
            request: {
                url: 'https://api.test/api/v1/kakao/turn-complete',
                headers: { ...headers },
            },
        });

        for (const result of [errorEvent, transaction]) {
            expect(result?.request?.headers).toEqual({
                'content-type': 'application/json',
                'user-agent': 'jest',
            });
        }
    });
});

describe('트레이스 제외 경로', () => {
    it('헬스체크와 Swagger 문서 요청은 트레이스를 남기지 않는다', () => {
        const { ignoreIncomingRequests } = loadOptions().integrations[0];

        expect(ignoreIncomingRequests('/health')).toBe(true);
        expect(ignoreIncomingRequests('/health?probe=1')).toBe(true);
        expect(ignoreIncomingRequests('/docs')).toBe(true);
        expect(ignoreIncomingRequests('/docs-json')).toBe(true);
        expect(ignoreIncomingRequests('/blocks')).toBe(false);
        expect(ignoreIncomingRequests('/healthz')).toBe(false);
    });
});

describe('Sentry Logs', () => {
    it('debug 로그는 보내지 않고 나머지는 보낸다', () => {
        const options = loadOptions();
        const info = { level: 'info', message: 'ok' };

        expect(options.beforeSendLog({ level: 'debug', message: 'noise' })).toBeNull();
        expect(options.beforeSendLog(info)).toBe(info);
    });
});

describe('디스코드 알림 스위치', () => {
    const WEBHOOK = 'https://discord.test/webhook';
    const errorEvent = () => ({
        level: 'error',
        exception: { values: [{ type: 'Error', value: 'boom' }] },
        request: { url: 'https://api.folioo.ai/api/v1/blocks', headers: {} },
    });

    const sendAndCount = (env: Record<string, string | undefined>): number => {
        const fetchSpy = jest
            .spyOn(global, 'fetch')
            .mockResolvedValue(new Response(null, { status: 204 }));
        loadOptions(env).beforeSend(errorEvent());
        return fetchSpy.mock.calls.length;
    };

    it('prod에서 Webhook URL이 있으면 에러 이벤트를 디스코드로도 보낸다', () => {
        expect(sendAndCount({ APP_PROFILE: 'prod', DISCORD_WEBHOOK_URL: WEBHOOK })).toBe(1);
    });

    it('dev는 보내지 않고, DISCORD_ALERT_ENABLED=true일 때만 보낸다', () => {
        expect(sendAndCount({ APP_PROFILE: 'dev', DISCORD_WEBHOOK_URL: WEBHOOK })).toBe(0);
        expect(
            sendAndCount({
                APP_PROFILE: 'local',
                DISCORD_WEBHOOK_URL: WEBHOOK,
                DISCORD_ALERT_ENABLED: 'true',
            })
        ).toBe(1);
    });

    it('Webhook URL이 없으면 보내지 않는다', () => {
        expect(sendAndCount({ APP_PROFILE: 'prod', DISCORD_WEBHOOK_URL: undefined })).toBe(0);
    });
});

describe('릴리스', () => {
    it('배포 이미지는 SENTRY_RELEASE(git SHA)를 쓴다', () => {
        expect(loadOptions({ SENTRY_RELEASE: 'folioo-server@abc123' }).release).toBe(
            'folioo-server@abc123'
        );
    });

    it('SENTRY_RELEASE가 없으면 (로컬) package.json 버전을 쓴다', () => {
        expect(loadOptions({ SENTRY_RELEASE: undefined }).release).toMatch(
            /^folioo-server@\d+\.\d+\.\d+/
        );
    });
});

describe('에러 샘플링', () => {
    it('dev는 에러를 절반만 보내고, prod와 local은 전부 보낸다', () => {
        expect(loadOptions({ APP_PROFILE: 'dev' }).sampleRate).toBe(0.5);
        expect(loadOptions({ APP_PROFILE: 'prod' }).sampleRate).toBe(1);
        expect(loadOptions({ APP_PROFILE: 'local' }).sampleRate).toBe(1);
    });
});
