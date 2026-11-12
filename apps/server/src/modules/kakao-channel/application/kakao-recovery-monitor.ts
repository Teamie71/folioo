import * as Sentry from '@sentry/nestjs';
import { createKeyThrottle } from 'src/common/utils/key-throttle.util';

/**
 * 카카오 턴 복구 작업(`recoverPending`, 10초 주기)이 살아 있는지 Sentry Cron Monitor로 알린다.
 *
 * 복구 작업은 안쪽 await 하나가 끝나지 않으면 `recovering` 플래그가 풀리지 않아
 * 에러·로그 없이 멈출 수 있다. 실패는 kakao-error-reporter가 잡고, 멈춤은 이 체크인이 끊기는 것으로 잡는다.
 *
 * - 체크인은 1분에 한 번만 보낸다 (Sentry 제한: monitor 환경당 분당 6회)
 * - 3분 동안 체크인이 없으면 Missed, 실패가 3번 연속이면 이슈가 생긴다 (알림은 이메일)
 * - dev는 서버를 일부러 내려 두는 일이 많아 보내지 않는다
 */
export const KAKAO_RECOVERY_MONITOR_SLUG = 'kakao-recover-pending';
export const KAKAO_RECOVERY_CHECK_IN_INTERVAL_MS = 60 * 1000;

const MONITOR_CONFIG = {
    schedule: { type: 'interval', value: 1, unit: 'minute' },
    checkinMargin: 3,
    maxRuntime: 5,
    failureIssueThreshold: 3,
    recoveryThreshold: 1,
} as const;

const shouldCheckIn = createKeyThrottle(KAKAO_RECOVERY_CHECK_IN_INTERVAL_MS);

export function checkInKakaoRecovery(status: 'ok' | 'error'): void {
    if (process.env.APP_PROFILE === 'dev') return;
    // 실패는 성공 체크인에 막히지 않도록 키를 나눈다.
    if (!shouldCheckIn(status)) return;

    Sentry.captureCheckIn({ monitorSlug: KAKAO_RECOVERY_MONITOR_SLUG, status }, MONITOR_CONFIG);
}
