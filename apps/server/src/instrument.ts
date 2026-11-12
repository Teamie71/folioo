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

type RequestEvent = {
    request?: {
        url?: string;
        data?: unknown;
        headers?: Record<string, string>;
    };
};

const isKakaoSkillRequest = (event: RequestEvent): boolean =>
    event.request?.url?.includes(KAKAO_SKILL_PATH) ?? false;

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
    }
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

    // 릴리스 버전 추적
    release: `folioo-server@${version}`,

    // Tracing 샘플링 (prod 30%)
    tracesSampleRate: appProfile === 'prod' ? 0.3 : 1.0,

    // PII(개인식별정보) 전송 여부. 사용자는 setUser로 ID만 넣는다.
    sendDefaultPii: false,

    // Sentry Logs (SDK 10.71.0 미만은 직접 켜야 한다)
    enableLogs: true,
    beforeSendLog: (log) => (log.level === 'debug' ? null : log),

    // 카카오 턴은 콜백 토큰이 오가므로 트레이스를 남기지 않는다.
    integrations: [
        Sentry.httpIntegration({
            ignoreIncomingRequests: (path) =>
                path.startsWith(KAKAO_SKILL_PATH) || isUntracedPath(path),
            ignoreOutgoingRequests: (url) =>
                url.includes('/kakao/turns') || url.includes('/bot-api.kakao.com/'),
        }),
    ],
    beforeSend: (event) => {
        const scrubbed = scrubRequest(event);
        sendDiscordAlert?.(scrubbed);
        return scrubbed;
    },
    beforeSendTransaction: (event) => (isKakaoSkillRequest(event) ? null : scrubRequest(event)),
});
