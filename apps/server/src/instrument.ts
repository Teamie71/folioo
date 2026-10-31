/**
 * Sentry Instrumentation
 * =======================
 * 이 파일은 앱 시작 전 가장 먼저 로드되어야 합니다.
 * main.ts에서 다른 import보다 먼저 import해야 합니다.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nestjs/
 */
import * as Sentry from '@sentry/nestjs';
import { version } from '../package.json';

const appProfile = process.env.APP_PROFILE || 'local';
const isLocal = appProfile === 'local';

Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Local 환경에서는 Sentry 비활성화
    enabled: !isLocal,

    // 환경 구분
    environment: appProfile,

    // 릴리스 버전 추적
    release: `folioo-server@${version}`,

    // Tracing 샘플링 (prod 30%)
    tracesSampleRate: appProfile === 'prod' ? 0.3 : 1.0,

    // PII(개인식별정보) 전송 여부
    sendDefaultPii: false,

    // 스킬 본문의 callbackUrl은 일회용 토큰이다. 카카오 턴은 로그의 안전한 메타데이터로만 관측한다.
    integrations: [
        Sentry.httpIntegration({
            ignoreIncomingRequests: (path) => path.startsWith('/kakao/skill/'),
            ignoreOutgoingRequests: (url) =>
                url.includes('/kakao/turns') || url.includes('/bot-api.kakao.com/'),
        }),
    ],
    beforeSend: (event) => (event.request?.url?.includes('/kakao/skill/') ? null : event),
    beforeSendTransaction: (event) =>
        event.request?.url?.includes('/kakao/skill/') ? null : event,
});
