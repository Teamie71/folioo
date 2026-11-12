/**
 * Sentry Instrumentation
 * =======================
 * 이 파일은 앱 시작 전 가장 먼저 로드되어야 합니다.
 * main.ts에서 다른 import보다 먼저 import해야 합니다.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nestjs/
 */
import { existsSync } from 'node:fs';
import * as Sentry from '@sentry/nestjs';
import { version } from '../package.json';
import { createDiscordAlert } from './common/alert/discord-alert';

// 이 파일은 ConfigModule보다 먼저 실행되므로 로컬 .env를 여기서 먼저 읽는다.
// dev/prod는 컨테이너가 환경변수를 직접 넣는다. 이미 있는 환경변수는 덮어쓰지 않는다.
if (existsSync('.env')) {
    process.loadEnvFile('.env');
}

const appProfile = process.env.APP_PROFILE || 'local';
const isLocal = appProfile === 'local';

// 스킬 본문의 callbackUrl은 일회용 토큰이다. 에러는 남기되 본문은 보내지 않는다.
const KAKAO_SKILL_PATH = '/kakao/skill/';

// 요청 헤더 중 인증 토큰, 내부 API 키(x-api-key), 카카오 스킬 시크릿(x-kakao-skill-secret) 등은 보내지 않는다.
// SDK는 sendDefaultPii: false여도 쿠키·IP 헤더만 지우고 나머지 헤더는 그대로 보낸다.
const SENSITIVE_HEADER_PATTERN = /auth|token|secret|key|cookie|session|password/i;

// OAuth 콜백(로그인, 카카오 계정 연결)은 쿼리에 인가 코드(code)와 state가 실린다.
// SDK는 요청의 url·query_string을 기본으로 이벤트에 넣으므로 이 값들을 지우고, 콜백은 트레이스도 남기지 않는다.
const OAUTH_CALLBACK_PATH_PATTERN = /^\/(auth\/(kakao|google|naver)|kakao-channel\/link)\/callback/;
const isSensitiveQueryKey = (key: string): boolean =>
    key === 'code' || key === 'state' || SENSITIVE_HEADER_PATTERN.test(key);

type QueryString = string | [string, string][] | Record<string, string>;

type RequestEvent = {
    request?: {
        url?: string;
        data?: unknown;
        query_string?: QueryString;
        headers?: Record<string, string>;
    };
};

const isKakaoSkillRequest = (event: RequestEvent): boolean =>
    event.request?.url?.includes(KAKAO_SKILL_PATH) ?? false;

const pathOf = (url: string): string => {
    try {
        return new URL(url, 'http://localhost').pathname;
    } catch {
        return url.split('?')[0];
    }
};

const isOAuthCallbackPath = (urlOrPath: string): boolean =>
    OAUTH_CALLBACK_PATH_PATTERN.test(pathOf(urlOrPath));

const scrubUrl = (url: string): string => {
    const queryStart = url.indexOf('?');
    if (queryStart < 0) return url;
    const params = new URLSearchParams(url.slice(queryStart + 1));
    for (const key of [...params.keys()]) {
        if (isSensitiveQueryKey(key)) params.delete(key);
    }
    const query = params.toString();
    return query ? `${url.slice(0, queryStart)}?${query}` : url.slice(0, queryStart);
};

const scrubQueryString = (query: QueryString): QueryString => {
    if (typeof query === 'string') return scrubUrl(`?${query}`).slice(1);
    if (Array.isArray(query)) return query.filter(([key]) => !isSensitiveQueryKey(key));
    return Object.fromEntries(Object.entries(query).filter(([key]) => !isSensitiveQueryKey(key)));
};

// 요청 본문은 5xx 이벤트에 그대로 실린다. 헤더와 같은 기준으로 민감한 키(link_token, password 등)를 지운다.
const MAX_BODY_DEPTH = 5;
const scrubBodyValue = (value: unknown, depth = 0): unknown => {
    if (depth > MAX_BODY_DEPTH || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((item) => scrubBodyValue(item, depth + 1));
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
            .filter(([key]) => !SENSITIVE_HEADER_PATTERN.test(key))
            .map(([key, item]) => [key, scrubBodyValue(item, depth + 1)])
    );
};

const scrubBody = (data: unknown): unknown => {
    if (typeof data !== 'string') return scrubBodyValue(data);
    try {
        return JSON.stringify(scrubBodyValue(JSON.parse(data)));
    } catch {
        // JSON이 아니면 form-urlencoded로 보고 같은 기준으로 지운다.
        return scrubUrl(`?${data}`).slice(1);
    }
};

const scrubRequest = <T extends RequestEvent>(event: T): T => {
    const request = event.request;
    if (!request) return event;

    if (request.headers) {
        request.headers = Object.fromEntries(
            Object.entries(request.headers).filter(([name]) => !SENSITIVE_HEADER_PATTERN.test(name))
        );
    }
    if (isKakaoSkillRequest(event)) {
        delete request.data;
    } else if (request.data !== undefined) {
        request.data = scrubBody(request.data);
    }
    if (request.url) request.url = scrubUrl(request.url);
    if (request.query_string) request.query_string = scrubQueryString(request.query_string);
    return event;
};

// 헬스체크와 Swagger 문서 요청은 트레이스를 남기지 않는다 (Tracing 쿼터 절약).
const isUntracedPath = (urlPath: string): boolean => {
    const path = urlPath.split('?')[0];
    return path === '/health' || path.startsWith('/docs');
};

// 디스코드 알림은 prod만 보낸다. 다른 환경은 테스트할 때만 DISCORD_ALERT_ENABLED=true로 켠다.
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
const sendDiscordAlert =
    discordWebhookUrl && (appProfile === 'prod' || process.env.DISCORD_ALERT_ENABLED === 'true')
        ? createDiscordAlert({ webhookUrl: discordWebhookUrl, sentryOrg: process.env.SENTRY_ORG })
        : undefined;

Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // local은 기본으로 끄고, 로컬 테스트할 때만 SENTRY_ENABLED=true로 켠다.
    enabled: !isLocal || process.env.SENTRY_ENABLED === 'true',

    // 환경 구분
    environment: appProfile,

    // 릴리스: 배포 환경이 SENTRY_RELEASE(예: folioo-server@<git SHA>)를 넣으면 그 값을, 없으면 package.json 버전을 쓴다.
    release: process.env.SENTRY_RELEASE || `folioo-server@${version}`,

    // 에러 샘플링: dev는 절반만 보낸다 (Errors 월 5k를 prod와 같이 쓰므로). prod·local은 전부.
    sampleRate: appProfile === 'dev' ? 0.5 : 1.0,

    // Tracing 샘플링 (prod 30%)
    tracesSampleRate: appProfile === 'prod' ? 0.3 : 1.0,

    // PII(개인식별정보) 전송 여부. 사용자는 setUser로 ID만 넣는다.
    sendDefaultPii: false,

    // Sentry Logs (SDK 10.71.0 미만은 직접 켜야 한다)
    enableLogs: true,
    beforeSendLog: (log) => (log.level === 'debug' ? null : log),

    // 카카오 턴과 OAuth 콜백은 토큰·인가 코드가 오가므로 트레이스를 남기지 않는다.
    integrations: [
        Sentry.httpIntegration({
            ignoreIncomingRequests: (path) =>
                path.startsWith(KAKAO_SKILL_PATH) ||
                isOAuthCallbackPath(path) ||
                isUntracedPath(path),
            ignoreOutgoingRequests: (url) =>
                url.includes('/kakao/turns') || url.includes('/bot-api.kakao.com/'),
        }),
    ],
    beforeSend: (event) => {
        const scrubbed = scrubRequest(event);
        sendDiscordAlert?.(scrubbed);
        return scrubbed;
    },
    beforeSendTransaction: (event) =>
        isKakaoSkillRequest(event) || isOAuthCallbackPath(event.request?.url ?? '')
            ? null
            : scrubRequest(event),
});
