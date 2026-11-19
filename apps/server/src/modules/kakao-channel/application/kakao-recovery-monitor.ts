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
 *
 * 감시 범위: "복구 작업이 멈추지 않고 끝까지 돌았는가"만 본다. 스캔(findPendingTurns) 자체가 실패하면 error,
 * 끝까지 돌면 개별 턴 복구가 실패했더라도 ok다. 개별 턴 실패는 이미 `recover-turn` ①로 Sentry Errors·디스코드에
 * 사용자별로 알린다. 이를 Cron error로도 보내면 AI 서버가 잠깐 불안정할 때마다 Monitor가 Failed로 흔들리고
 * 같은 장애가 메일로 한 번 더 온다.
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
