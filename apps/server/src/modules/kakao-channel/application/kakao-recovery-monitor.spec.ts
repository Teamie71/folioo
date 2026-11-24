jest.mock('@sentry/nestjs', () => ({ captureCheckIn: jest.fn() }));
import * as Sentry from '@sentry/nestjs';

type Monitor = typeof import('./kakao-recovery-monitor');

/** throttle 상태가 테스트끼리 섞이지 않도록 매번 새로 불러온다. */
function loadMonitor(): Monitor {
    let monitor: Monitor | undefined;
    jest.isolateModules(() => {
        monitor = jest.requireActual<Monitor>('./kakao-recovery-monitor');
    });
    return monitor as Monitor;
}

const ORIGINAL_ENV = process.env;

describe('kakao-recovery-monitor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers().setSystemTime(0);
        process.env = { ...ORIGINAL_ENV, APP_PROFILE: 'prod' };
    });

    afterEach(() => {
        jest.useRealTimers();
        process.env = ORIGINAL_ENV;
    });

    it('복구 작업 성공을 1분 주기 monitor 설정과 함께 체크인한다', () => {
        loadMonitor().checkInKakaoRecovery('ok');

        expect(Sentry.captureCheckIn).toHaveBeenCalledWith(
            { monitorSlug: 'kakao-recover-pending', status: 'ok' },
            expect.objectContaining({
                schedule: { type: 'interval', value: 1, unit: 'minute' },
                checkinMargin: 3,
            })
        );
    });

    it('10초마다 불려도 1분에 한 번만 보낸다 (Sentry 분당 6회 제한)', () => {
        const { checkInKakaoRecovery, KAKAO_RECOVERY_CHECK_IN_INTERVAL_MS } = loadMonitor();

        for (let i = 0; i < 6; i++) {
            checkInKakaoRecovery('ok');
            jest.advanceTimersByTime(10_000);
        }
        expect(Sentry.captureCheckIn).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(KAKAO_RECOVERY_CHECK_IN_INTERVAL_MS);
        checkInKakaoRecovery('ok');
        expect(Sentry.captureCheckIn).toHaveBeenCalledTimes(2);
    });

    it('실패 체크인은 성공 체크인에 막히지 않는다', () => {
        const { checkInKakaoRecovery } = loadMonitor();

        checkInKakaoRecovery('ok');
        checkInKakaoRecovery('error');

        expect(
            (Sentry.captureCheckIn as jest.Mock).mock.calls.map(
                ([checkIn]) => (checkIn as { status: string }).status
            )
        ).toEqual(['ok', 'error']);
    });

    it('dev는 체크인하지 않는다', () => {
        process.env.APP_PROFILE = 'dev';

        loadMonitor().checkInKakaoRecovery('ok');

        expect(Sentry.captureCheckIn).not.toHaveBeenCalled();
    });
});
