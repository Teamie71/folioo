jest.mock('typeorm-transactional', () => ({ Transactional: () => () => undefined }));
jest.mock('../kakao-error-reporter');
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { BlockService } from 'src/modules/block/application/services/block.service';
import { AiAgentUsageService } from 'src/modules/block/application/services/ai-agent-usage.service';
import { AiExperienceSessionService } from 'src/modules/block/application/services/ai-experience-session.service';
import { UserService } from 'src/modules/user/application/services/user.service';
import { User } from 'src/modules/user/domain/user.entity';
import { UserStatus } from 'src/modules/user/domain/enums/user-status.enum';
import { AiRelayPort } from 'src/common/ports/ai-relay.port';
import { KakaoSkillFacade } from './kakao-skill.facade';
import { KakaoTurnService } from '../services/kakao-turn.service';
import { KakaoChannelLinkService } from '../services/kakao-channel-link.service';
import { KAKAO_MESSAGES } from '../kakao-messages';
import { textResponse } from '../kakao-skill-response';
import {
    reportKakaoAiRelayFailure,
    reportKakaoAiTurnFailure,
    reportKakaoError,
} from '../kakao-error-reporter';

describe('Kakao turn contract', () => {
    const payload = {
        userRequest: {
            utterance: '축제 부스 운영',
            callbackUrl: 'https://bot-api.kakao.com/v1/callback/token',
        },
    };
    const relay = { postJson: jest.fn(), getJson: jest.fn() };
    const turns = new KakaoTurnService(relay as unknown as AiRelayPort);
    const links = {
        findByUserId: jest.fn(),
        isTurnInProgress: jest.fn(),
        setQueryTimeout: jest.fn(),
        acquireTurnLock: jest.fn(),
        releaseTurnLock: jest.fn(),
        findPendingTurns: jest.fn(),
    };
    const usage = {
        consume: jest.fn(),
        markFailed: jest.fn(),
        lockUser: jest.fn(),
        hasReservation: jest.fn(),
    };
    const sessions = { getOrCreate: jest.fn() };
    const blocks = { findExperienceOrThrow: jest.fn() };
    const users = { findByIdOrThrow: jest.fn() };
    let facade: KakaoSkillFacade;

    beforeEach(() => {
        jest.resetAllMocks();
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        usage.hasReservation.mockResolvedValue(true);
        links.acquireTurnLock.mockResolvedValue(true);
        links.findByUserId.mockResolvedValue(null);
        links.findPendingTurns.mockResolvedValue([]);
        sessions.getOrCreate.mockResolvedValue({ sessionId: 'session-1' });
        users.findByIdOrThrow.mockResolvedValue(
            Object.assign(new User(), { status: UserStatus.ACTIVE, isActive: true })
        );
        relay.postJson.mockResolvedValue({ status: 202 });
        relay.getJson.mockResolvedValue({ status: 404 });
        facade = new KakaoSkillFacade(
            users as unknown as UserService,
            links as unknown as KakaoChannelLinkService,
            new ConfigService({ KAKAO_WEB_EXPERIENCE_URL: 'https://folioo.test/experience' }),
            blocks as unknown as BlockService,
            sessions as unknown as AiExperienceSessionService,
            usage as unknown as AiAgentUsageService,
            turns
        );
    });
    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('예약이 끝난 뒤 접수하고 같은 request_id와 실행 기한을 전달한다', async () => {
        relay.postJson.mockImplementation(() => {
            expect(usage.consume).toHaveBeenCalledTimes(1);
            return Promise.resolve({ status: 202 });
        });
        const startedAt = Date.now();
        expect(await facade.submit(1, '12', payload, startedAt)).toEqual({
            version: '2.0',
            useCallback: true,
            data: { text: KAKAO_MESSAGES.ACCEPTED },
        });
        const request = (relay.postJson.mock.calls as unknown[][])[0][0] as {
            body: { request_id: string; expires_at: string };
            timeoutMs: number;
        };
        expect(usage.consume).toHaveBeenCalledWith(
            1,
            request.body.request_id,
            expect.any(Date),
            expect.any(Number)
        );
        expect(request.body.expires_at).toBe(new Date(startedAt + 50_000).toISOString());
        expect(request.timeoutMs).toBeLessThanOrEqual(3000);
        expect(usage.markFailed).not.toHaveBeenCalled();
    });

    it.each([400, 401, 403, 404, 422])(
        '확정 미접수 %s는 한도와 잠금을 보상한다',
        async (status) => {
            relay.postJson.mockResolvedValue({ status });
            expect(await facade.submit(1, '12', payload, Date.now())).toEqual(
                facade.failureResponse()
            );
            expect(usage.markFailed).toHaveBeenCalledTimes(1);
            expect(links.releaseTurnLock).toHaveBeenCalledTimes(1);
        }
    );

    it.each([409, 500, 503, 200])('접수 불명 %s는 콜백 대기와 예약을 유지한다', async (status) => {
        relay.postJson.mockResolvedValue({ status });
        expect(await facade.submit(1, '12', payload, Date.now())).toMatchObject({
            useCallback: true,
        });
        expect(usage.markFailed).not.toHaveBeenCalled();
        expect(links.releaseTurnLock).not.toHaveBeenCalled();
    });

    it('접수 timeout은 예약을 유지하고 민감한 예외를 출력하지 않는다', async () => {
        relay.postJson.mockRejectedValue(new Error(payload.userRequest.callbackUrl));
        expect(await facade.submit(1, '12', payload, Date.now())).toMatchObject({
            useCallback: true,
        });
        expect(usage.markFailed).not.toHaveBeenCalled();
        expect(JSON.stringify((Logger.prototype.error as jest.Mock).mock.calls)).not.toContain(
            'callback/token'
        );
    });

    it.each(['', ' ', '😀'.repeat(501), undefined, 42])(
        '잘못된 입력은 차감/AI 호출 없이 거부한다',
        async (utterance) => {
            const input = { userRequest: { ...payload.userRequest, utterance } };
            expect(await facade.submit(1, '12', input as typeof payload, Date.now())).toEqual(
                textResponse(KAKAO_MESSAGES.INVALID_INPUT)
            );
            expect(usage.consume).not.toHaveBeenCalled();
            expect(sessions.getOrCreate).not.toHaveBeenCalled();
        }
    );

    it('이모지 500개는 코드포인트 500자로 접수한다', async () => {
        const response = await facade.submit(
            1,
            '12',
            { userRequest: { ...payload.userRequest, utterance: '😀'.repeat(500) } },
            Date.now()
        );
        expect(response).toMatchObject({ useCallback: true });
    });

    it.each([
        undefined,
        'http://bot-api.kakao.com/v1/token',
        'https://bot-api.kakao.com.evil.test/v1/token',
        'https://user:pass@bot-api.kakao.com/v1/token',
        'https://bot-api.kakao.com:444/v1/token',
        'https://bot-api.kakao.com/v1/token#secret',
        'https://127.0.0.1/v1/token',
    ])('잘못된 콜백 대상 %s는 접수하지 않는다', async (callbackUrl) => {
        expect(
            await facade.submit(
                1,
                '12',
                { userRequest: { ...payload.userRequest, callbackUrl } },
                Date.now()
            )
        ).toEqual(facade.failureResponse());
        expect(usage.consume).not.toHaveBeenCalled();
        expect(relay.postJson).not.toHaveBeenCalled();
    });

    it('세션 생성 실패는 예약하지 않는다', async () => {
        sessions.getOrCreate.mockRejectedValue(new Error('AI unavailable'));
        expect(await facade.submit(1, '12', payload, Date.now())).toEqual(facade.failureResponse());
        expect(usage.consume).not.toHaveBeenCalled();
        expect(relay.postJson).not.toHaveBeenCalled();
    });

    it('세션 선확보 실패는 선택 후 안내를 막지 않는다', async () => {
        sessions.getOrCreate.mockRejectedValue(new Error('AI unavailable'));
        await expect(facade.prewarm(1, '12', Date.now())).resolves.toBeUndefined();
    });

    it('잠금 경합에서는 차감/접수하지 않는다', async () => {
        links.acquireTurnLock.mockResolvedValue(false);
        expect(await facade.submit(1, '12', payload, Date.now())).toEqual(
            textResponse(KAKAO_MESSAGES.TURN_IN_PROGRESS)
        );
        expect(usage.consume).not.toHaveBeenCalled();
        expect(relay.postJson).not.toHaveBeenCalled();
    });

    it('한도 초과 및 예약 실패는 AI를 호출하지 않는다', async () => {
        usage.consume.mockRejectedValue(
            new BusinessException(ErrorCode.EXPERIENCE_MAP_DAILY_LIMIT_EXCEEDED)
        );
        expect(await facade.submit(1, '12', payload, Date.now())).toEqual(
            textResponse(KAKAO_MESSAGES.DAILY_LIMIT)
        );
        expect(relay.postJson).not.toHaveBeenCalled();
    });

    it('세션 지연만큼 접수 timeout을 줄여 전체 예산을 넘기지 않는다', async () => {
        jest.useFakeTimers();
        const startedAt = Date.now();
        sessions.getOrCreate.mockImplementation(() => {
            jest.setSystemTime(startedAt + 3200);
            return Promise.resolve({ sessionId: 'session-1' });
        });
        await facade.submit(1, '12', payload, startedAt);
        expect((relay.postJson.mock.calls as unknown[][])[0][0]).toMatchObject({ timeoutMs: 600 });
    });

    it('시간 예산 소진 후에는 새 외부 호출을 시작하지 않는다', async () => {
        expect(await facade.submit(1, '12', payload, Date.now() - 4000)).toEqual(
            facade.failureResponse()
        );
        expect(sessions.getOrCreate).not.toHaveBeenCalled();
        expect(relay.postJson).not.toHaveBeenCalled();
    });

    it.each(['ACCEPTED', 'RUNNING', 'COMMIT_UNKNOWN'])(
        '미확정 상태 %s는 잠금/한도를 유지한다',
        async (state) => {
            relay.getJson.mockResolvedValue({
                status: 200,
                data: { request_id: 'r1', state, delivery_status: 'UNKNOWN' },
            });
            await facade.recoverUser(1, 'r1');
            expect(links.releaseTurnLock).not.toHaveBeenCalled();
            expect(usage.markFailed).not.toHaveBeenCalled();
        }
    );

    it.each(['FAILED', 'EXPIRED', 'SUCCEEDED'])(
        '재시작 후에도 terminal %s를 조회해 완료한다',
        async (state) => {
            relay.getJson.mockResolvedValue({
                status: 200,
                data: { request_id: 'r1', state, delivery_status: 'FAIL' },
            });
            links.findPendingTurns.mockResolvedValue([{ userId: 1, turnRequestId: 'r1' }]);
            await facade.recoverPending();
            expect(links.releaseTurnLock).toHaveBeenCalledWith(1, 'r1');
            expect(usage.markFailed).toHaveBeenCalledTimes(state === 'SUCCEEDED' ? 0 : 1);
            expect(relay.postJson).not.toHaveBeenCalled();
        }
    );

    it('404·조회 장애·다른 요청 응답은 성급하게 환불하지 않는다', async () => {
        for (const response of [
            { status: 404 },
            { status: 503 },
            {
                status: 200,
                data: { request_id: 'other', state: 'FAILED', delivery_status: 'FAIL' },
            },
        ]) {
            relay.getJson.mockResolvedValue(response);
            await facade.recoverUser(1, 'r1');
        }
        expect(usage.markFailed).not.toHaveBeenCalled();
        expect(links.releaseTurnLock).not.toHaveBeenCalled();
    });

    it('커밋 결과 불명 완료는 잠금/사용량을 바꾸지 않는다', async () => {
        await facade.complete({
            user_id: '1',
            request_id: 'r1',
            outcome: 'COMMIT_UNKNOWN',
            delivery_status: 'UNKNOWN',
        });
        expect(usage.markFailed).not.toHaveBeenCalled();
        expect(links.releaseTurnLock).not.toHaveBeenCalled();
    });

    it('확정 미접수 보상 장애는 다음 복구 때 재시도한다', async () => {
        relay.postJson.mockResolvedValue({ status: 404 });
        links.releaseTurnLock.mockRejectedValueOnce(new Error('db failed'));
        await facade.submit(1, '12', payload, Date.now());
        const requestId = (
            (relay.postJson.mock.calls as unknown[][])[0][0] as { body: { request_id: string } }
        ).body.request_id;
        await facade.recoverUser(1, requestId);
        expect(links.releaseTurnLock).toHaveBeenCalledTimes(2);
        expect(relay.getJson).not.toHaveBeenCalled();
    });

    describe('Sentry 실패 보고', () => {
        const submittedRequestId = () =>
            ((relay.postJson.mock.calls as unknown[][])[0][0] as { body: { request_id: string } })
                .body.request_id;

        it('정상 접수는 보고하지 않는다', async () => {
            await facade.submit(1, '12', payload, Date.now());
            expect(reportKakaoAiRelayFailure).not.toHaveBeenCalled();
            expect(reportKakaoAiTurnFailure).not.toHaveBeenCalled();
            expect(reportKakaoError).not.toHaveBeenCalled();
        });

        it('② AI가 접수를 거절하면 ai-relay로 보고하고, 보상 처리는 ③으로 보고하지 않는다', async () => {
            relay.postJson.mockResolvedValue({ status: 404 });
            await facade.submit(1, '12', payload, Date.now());

            expect(reportKakaoAiRelayFailure).toHaveBeenCalledWith('submit', 'REJECTED', {
                userId: 1,
                requestId: submittedRequestId(),
            });
            expect(usage.markFailed).toHaveBeenCalledTimes(1);
            expect(reportKakaoAiTurnFailure).not.toHaveBeenCalled();
        });

        it('② 접수 timeout은 UNKNOWN으로 보고하고 콜백 토큰을 넘기지 않는다', async () => {
            relay.postJson.mockRejectedValue(new Error(payload.userRequest.callbackUrl));
            await facade.submit(1, '12', payload, Date.now());

            expect(reportKakaoAiRelayFailure).toHaveBeenCalledWith('submit', 'UNKNOWN', {
                userId: 1,
                requestId: submittedRequestId(),
            });
            expect(
                JSON.stringify((reportKakaoAiRelayFailure as jest.Mock).mock.calls)
            ).not.toContain('callback/token');
        });

        it('① 턴 준비 중 예외는 request_id와 함께 보고한다', async () => {
            const error = new Error('session failed');
            sessions.getOrCreate.mockRejectedValue(error);
            await facade.submit(1, '12', payload, Date.now());

            expect(reportKakaoError).toHaveBeenCalledWith(error, 'submit', {
                userId: 1,
                requestId: expect.any(String) as string,
            });
        });

        it('일일 한도 초과는 보고하지 않는다', async () => {
            usage.consume.mockRejectedValue(
                new BusinessException(ErrorCode.EXPERIENCE_MAP_DAILY_LIMIT_EXCEEDED)
            );
            await facade.submit(1, '12', payload, Date.now());

            expect(reportKakaoError).not.toHaveBeenCalled();
        });

        it('① 보상 처리 실패는 compensate 단계로 보고한다', async () => {
            const error = new Error('db failed');
            relay.postJson.mockResolvedValue({ status: 404 });
            links.releaseTurnLock.mockRejectedValueOnce(error);
            await facade.submit(1, '12', payload, Date.now());

            expect(reportKakaoError).toHaveBeenCalledWith(error, 'compensate', {
                userId: 1,
                requestId: submittedRequestId(),
            });
        });

        it('③ AI 통지로 받은 실패 턴은 ai-internal로 보고한다', async () => {
            await facade.complete({
                user_id: '1',
                request_id: 'r1',
                outcome: 'FAILED',
                delivery_status: 'FAIL',
            });

            expect(reportKakaoAiTurnFailure).toHaveBeenCalledWith('FAIL', {
                userId: 1,
                requestId: 'r1',
            });
        });

        it('③ 이미 처리된 중복 통지와 성공 턴은 보고하지 않는다', async () => {
            usage.hasReservation.mockResolvedValueOnce(false);
            await facade.complete({
                user_id: '1',
                request_id: 'r1',
                outcome: 'FAILED',
                delivery_status: 'FAIL',
            });
            await facade.complete({
                user_id: '1',
                request_id: 'r2',
                outcome: 'SUCCEEDED',
                delivery_status: 'SUCCESS',
            });

            expect(reportKakaoAiTurnFailure).not.toHaveBeenCalled();
        });

        it.each(['FAILED', 'EXPIRED'])(
            '③ 복구 조회로 확인한 %s 턴도 ai-internal로 보고한다',
            async (state) => {
                relay.getJson.mockResolvedValue({
                    status: 200,
                    data: { request_id: 'r1', state, delivery_status: 'FAIL' },
                });
                links.findPendingTurns.mockResolvedValue([{ userId: 1, turnRequestId: 'r1' }]);
                await facade.recoverPending();

                expect(reportKakaoAiTurnFailure).toHaveBeenCalledWith('FAIL', {
                    userId: 1,
                    requestId: 'r1',
                });
            }
        );

        it('① 사용자 확인 전 실패는 카카오 appUserId로 구분해 보고한다', async () => {
            const error = new Error('db failed');
            links.setQueryTimeout.mockRejectedValueOnce(error);
            await facade.chat({
                ...payload,
                userRequest: {
                    ...payload.userRequest,
                    user: { properties: { appUserId: 'kakao-1' } },
                },
            } as Parameters<KakaoSkillFacade['chat']>[0]);

            expect(reportKakaoError).toHaveBeenCalledWith(error, 'chat', {
                kakaoAppUserId: 'kakao-1',
            });
        });

        it('① 복구 스캔 실패는 recover-scan 단계로 보고한다', async () => {
            const error = new Error('db down');
            links.findPendingTurns.mockRejectedValue(error);
            await facade.recoverPending();

            expect(reportKakaoError).toHaveBeenCalledWith(error, 'recover-scan');
        });
    });
});
