jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn(), captureMessage: jest.fn() }));
import * as Sentry from '@sentry/nestjs';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

type Reporter = typeof import('./kakao-error-reporter') & {
    BusinessException: typeof import('src/common/exceptions/business.exception').BusinessException;
};

/**
 * throttle 상태가 테스트끼리 섞이지 않도록 매번 새로 불러온다.
 * instanceof 판별이 맞도록 BusinessException도 같은 모듈 레지스트리에서 가져온다.
 */
function loadReporter(): Reporter {
    let reporter: Reporter | undefined;
    jest.isolateModules(() => {
        reporter = {
            ...jest.requireActual<typeof import('./kakao-error-reporter')>(
                './kakao-error-reporter'
            ),
            BusinessException: jest.requireActual<
                typeof import('src/common/exceptions/business.exception')
            >('src/common/exceptions/business.exception').BusinessException,
        };
    });
    return reporter as Reporter;
}

const MINUTE = 60 * 1000;

describe('kakao-error-reporter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers().setSystemTime(0);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('같은 사용자의 같은 실패만 5분에 한 번', () => {
        it('A, A, B, C, A 순서면 A의 1분 뒤 반복만 빠진다 (Events 4, Users 3)', () => {
            const { reportKakaoAiRelayFailure } = loadReporter();
            const fail = (userId: number) =>
                reportKakaoAiRelayFailure('submit', 'ERROR', { userId, requestId: `r-${userId}` });

            fail(1); // 10:00 A
            jest.advanceTimersByTime(1 * MINUTE);
            fail(1); // 10:01 A (5분 안 반복)
            jest.advanceTimersByTime(1 * MINUTE);
            fail(2); // 10:02 B
            jest.advanceTimersByTime(1 * MINUTE);
            fail(3); // 10:03 C
            jest.advanceTimersByTime(4 * MINUTE);
            fail(1); // 10:07 A (5분 지남)

            const users = (Sentry.captureMessage as jest.Mock).mock.calls.map(
                ([, context]) => (context as { user: { id: string } }).user.id
            );
            expect(users).toEqual(['1', '2', '3', '1']);
        });

        it('사용자를 모르는 실패(복구 스캔)는 종류별로 5분에 한 번', () => {
            const { reportKakaoError, KAKAO_REPORT_THROTTLE_MS } = loadReporter();

            reportKakaoError(new Error('db down'), 'recover-scan');
            jest.advanceTimersByTime(10_000);
            reportKakaoError(new Error('db down'), 'recover-scan');
            expect(Sentry.captureException).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(KAKAO_REPORT_THROTTLE_MS);
            reportKakaoError(new Error('db down'), 'recover-scan');
            expect(Sentry.captureException).toHaveBeenCalledTimes(2);
        });

        it('사용자 확인 전 실패는 카카오 appUserId로 구분하고, appUserId는 보내지 않는다', () => {
            const { reportKakaoError } = loadReporter();

            reportKakaoError(new Error('a'), 'chat', { kakaoAppUserId: 'kakao-1' });
            reportKakaoError(new Error('a'), 'chat', { kakaoAppUserId: 'kakao-1' });
            reportKakaoError(new Error('a'), 'chat', { kakaoAppUserId: 'kakao-2' });

            expect(Sentry.captureException).toHaveBeenCalledTimes(2);
            expect(JSON.stringify((Sentry.captureException as jest.Mock).mock.calls)).not.toContain(
                'kakao-1'
            );
        });
    });

    describe('① 우리 서버 자체 실패', () => {
        it('사용자 ID, 단계, request_id를 붙여 captureException한다', () => {
            const { reportKakaoError } = loadReporter();
            const error = new Error('db failed');

            reportKakaoError(error, 'submit', { userId: 3, requestId: 'r1' });

            expect(Sentry.captureException).toHaveBeenCalledWith(error, {
                tags: { component: 'kakao', 'kakao.stage': 'submit' },
                user: { id: '3' },
                extra: { request_id: 'r1' },
            });
        });

        it('사용자와 request_id를 모르면 넣지 않는다', () => {
            const { reportKakaoError } = loadReporter();
            const error = new Error('db down');

            reportKakaoError(error, 'recover-scan');

            expect(Sentry.captureException).toHaveBeenCalledWith(error, {
                tags: { component: 'kakao', 'kakao.stage': 'recover-scan' },
            });
        });

        it('AI 호출 예외는 ② ai-relay로 보낸다', () => {
            const { reportKakaoError, BusinessException } = loadReporter();

            reportKakaoError(new BusinessException(ErrorCode.AI_RELAY_REQUEST_FAILED), 'submit', {
                userId: 3,
                requestId: 'r1',
            });

            expect(Sentry.captureException).not.toHaveBeenCalled();
            expect(Sentry.captureMessage).toHaveBeenCalledWith('Kakao AI relay failed', {
                level: 'error',
                tags: {
                    component: 'kakao',
                    source: 'ai-relay',
                    'kakao.stage': 'submit',
                    'kakao.result': 'ERROR',
                },
                fingerprint: ['kakao', 'ai-relay', 'submit', 'ERROR'],
                user: { id: '3' },
                extra: { request_id: 'r1' },
            });
        });

        it('AI와 무관한 BusinessException은 ①로 보낸다', () => {
            const { reportKakaoError, BusinessException } = loadReporter();

            reportKakaoError(new BusinessException(ErrorCode.UNAUTHORIZED), 'submit');

            expect(Sentry.captureException).toHaveBeenCalledTimes(1);
            expect(Sentry.captureMessage).not.toHaveBeenCalled();
        });
    });

    describe('③ AI 서버 내부 실패', () => {
        it('요청 scope가 없어도 사용자 ID를 이벤트에 직접 넣고 전달 상태별로 묶는다', () => {
            const { reportKakaoAiTurnFailure } = loadReporter();

            reportKakaoAiTurnFailure('FAIL', { userId: 4, requestId: 'r1' });

            expect(Sentry.captureMessage).toHaveBeenCalledWith('Kakao AI turn failed', {
                level: 'error',
                tags: {
                    component: 'kakao',
                    source: 'ai-internal',
                    'kakao.delivery_status': 'FAIL',
                },
                fingerprint: ['kakao', 'ai-internal', 'FAIL'],
                user: { id: '4' },
                extra: { request_id: 'r1' },
            });
        });
    });
});
