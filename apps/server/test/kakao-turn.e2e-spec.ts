jest.mock('typeorm-transactional', () => ({ Transactional: () => () => undefined }));
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD, HttpAdapterHost, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { AuthTokenStoreService } from '../src/modules/auth/infrastructure/services/auth-token-store.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpAiSseRelayAdapter } from '../src/infra/ai-relay/http-ai-sse-relay.adapter';
import { AiRelayPort } from '../src/common/ports/ai-relay.port';
import { UserService } from '../src/modules/user/application/services/user.service';
import { User } from '../src/modules/user/domain/user.entity';
import { UserStatus } from '../src/modules/user/domain/enums/user-status.enum';
import { KakaoChannelLink } from '../src/modules/kakao-channel/domain/kakao-channel-link.entity';
import { KakaoChannelLinkService } from '../src/modules/kakao-channel/application/services/kakao-channel-link.service';
import { KakaoSkillFacade } from '../src/modules/kakao-channel/application/facades/kakao-skill.facade';
import { KakaoTurnService } from '../src/modules/kakao-channel/application/services/kakao-turn.service';
import { KakaoSkillController } from '../src/modules/kakao-channel/presentation/kakao-skill.controller';
import { KakaoInternalController } from '../src/modules/kakao-channel/presentation/kakao-internal.controller';
import { AiAgentUsageService } from '../src/modules/block/application/services/ai-agent-usage.service';
import { AiExperienceSessionService } from '../src/modules/block/application/services/ai-experience-session.service';
import { BlockService } from '../src/modules/block/application/services/block.service';
import { KAKAO_MESSAGES } from '../src/modules/kakao-channel/application/kakao-messages';

describe('Kakao turn HTTP and AI mock integration', () => {
    let app: INestApplication;
    let ai: Server;
    let status = 202;
    let loseResponse = false;
    let delayResponse = false;
    let lastRequest: Record<string, unknown>;
    let aiApiKey: string | undefined;
    const link = Object.assign(KakaoChannelLink.create(1, 'k1'), {
        currentBlockId: '12',
        activitySelectedAt: new Date(),
    });
    const links = {
        findByKakaoAppUserId: jest.fn(),
        findByUserId: jest.fn(),
        isTurnInProgress: (row: KakaoChannelLink) =>
            KakaoChannelLinkService.prototype.isTurnInProgress(row),
        setQueryTimeout: jest.fn(),
        acquireTurnLock: jest.fn(),
        releaseTurnLock: jest.fn(),
        findPendingTurns: jest.fn(),
        selectBlock: jest.fn(),
    };
    const usage = {
        consume: jest.fn(),
        markFailed: jest.fn(),
        lockUser: jest.fn(),
        hasReservation: jest.fn(),
    };
    const sessions = { getOrCreate: jest.fn() };
    const blocks = { findExperience: jest.fn(), findExperienceOrThrow: jest.fn() };
    const users = { findByIdOrThrow: jest.fn() };
    const payload = {
        bot: { id: 'test-bot' },
        userRequest: {
            utterance: '축제 부스 운영',
            callbackUrl: 'https://bot-api.kakao.com/v1/callback/secret-token',
            user: { properties: { appUserId: 'k1' } },
        },
    };

    beforeAll(async () => {
        ai = createServer((req, res) => {
            let body = '';
            req.on('data', (chunk: Buffer) => {
                body += chunk.toString();
            });
            req.on('end', () => {
                if (req.method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(
                        JSON.stringify({
                            request_id: lastRequest.request_id,
                            state: 'SUCCEEDED',
                            delivery_status: 'FAIL',
                        })
                    );
                    return;
                }
                lastRequest = JSON.parse(body) as Record<string, unknown>;
                aiApiKey = req.headers['x-api-key'] as string;
                if (loseResponse) {
                    req.socket.destroy();
                    return;
                }
                if (delayResponse) {
                    setTimeout(() => {
                        res.writeHead(202);
                        res.end('{}');
                    }, 100);
                    return;
                }
                res.writeHead(status, { 'Content-Type': 'application/json' });
                res.end('{}');
            });
        });
        await new Promise<void>((resolve) => ai.listen(0, '127.0.0.1', resolve));
        const address = ai.address();
        if (!address || typeof address === 'string') throw new Error('AI mock address unavailable');
        const config = new ConfigService({
            AI_BASE_URL: `http://127.0.0.1:${address.port}`,
            AI_SERVICE_API_KEY: 'ai-key',
            MAIN_BACKEND_API_KEY: 'main-key',
            KAKAO_SKILL_SECRET: 'skill-key',
            KAKAO_BOT_ID: 'test-bot',
            KAKAO_WEB_EXPERIENCE_URL: 'https://folioo.test/experience',
        });
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const module = await Test.createTestingModule({
            imports: [HttpModule],
            controllers: [KakaoSkillController, KakaoInternalController],
            providers: [
                KakaoSkillFacade,
                KakaoTurnService,
                HttpAiSseRelayAdapter,
                { provide: AiRelayPort, useExisting: HttpAiSseRelayAdapter },
                { provide: ConfigService, useValue: config },
                { provide: KakaoChannelLinkService, useValue: links },
                { provide: AiAgentUsageService, useValue: usage },
                { provide: AiExperienceSessionService, useValue: sessions },
                { provide: BlockService, useValue: blocks },
                { provide: UserService, useValue: users },
                { provide: AuthTokenStoreService, useValue: {} },
                { provide: APP_GUARD, useClass: JwtAuthGuard },
            ],
        }).compile();
        app = module.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
        );
        app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));
        app.useGlobalFilters(new GlobalExceptionFilter(app.get(HttpAdapterHost)));
        await app.init();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        status = 202;
        loseResponse = false;
        delayResponse = false;
        link.turnRequestId = null;
        link.turnLockedUntil = null;
        links.findByKakaoAppUserId.mockResolvedValue(link);
        links.findByUserId.mockResolvedValue(link);
        links.acquireTurnLock.mockResolvedValue(true);
        usage.hasReservation.mockResolvedValue(true);
        sessions.getOrCreate.mockResolvedValue({ sessionId: 'session-1' });
        blocks.findExperience.mockResolvedValue({ id: '12' });
        users.findByIdOrThrow.mockResolvedValue(
            Object.assign(new User(), { id: 1, status: UserStatus.ACTIVE, isActive: true })
        );
    });

    afterAll(async () => {
        await app?.close();
        await new Promise<void>((resolve, reject) =>
            ai.close((err) => (err ? reject(err) : resolve()))
        );
        jest.restoreAllMocks();
    });

    const chat = () =>
        request(app.getHttpServer() as App)
            .post('/kakao/skill/chat')
            .set('x-kakao-skill-secret', 'skill-key');
    const complete = () =>
        request(app.getHttpServer() as App)
            .post('/api/v1/kakao/turn-complete')
            .set('X-API-Key', 'main-key');
    const completion = () => ({
        user_id: '1',
        request_id: randomUUID(),
        outcome: 'SUCCEEDED',
        delivery_status: 'SUCCESS',
    });

    it('JWT 없이 스킬 인증만으로 202 접수를 보내고 raw useCallback을 반환한다', async () => {
        const res = await chat().send(payload).expect(200);
        expect(res.body).toEqual({
            version: '2.0',
            useCallback: true,
            data: { text: KAKAO_MESSAGES.ACCEPTED },
        });
        expect(lastRequest).toMatchObject({
            user_id: '1',
            block_id: '12',
            utterance: payload.userRequest.utterance,
            callback_url: payload.userRequest.callbackUrl,
        });
        expect(aiApiKey).toBe('ai-key');
        expect(usage.consume).toHaveBeenCalledTimes(1);
    });

    it.each([404, 422])('실제 HTTP %s는 실패 카드와 예약 보상으로 처리한다', async (code) => {
        status = code;
        const res = await chat().send(payload).expect(200);
        expect(res.body).toHaveProperty(
            'template.outputs.0.textCard.description',
            KAKAO_MESSAGES.AI_FAILED
        );
        expect(usage.markFailed).toHaveBeenCalledTimes(1);
        expect(links.releaseTurnLock).toHaveBeenCalledTimes(1);
    });

    it.each([409, 503])('실제 HTTP %s는 접수 불명으로 유지한다', async (code) => {
        status = code;
        const res = await chat().send(payload).expect(200);
        expect(res.body).toHaveProperty('useCallback', true);
        expect(usage.markFailed).not.toHaveBeenCalled();
    });

    it('접수 후 연결이 끊겨도 상태 조회로 성공을 확인하며 사용량을 유지한다', async () => {
        loseResponse = true;
        expect((await chat().send(payload).expect(200)).body).toHaveProperty('useCallback', true);
        expect(usage.markFailed).not.toHaveBeenCalled();
        await app.get(KakaoSkillFacade).recoverUser(1, String(lastRequest.request_id));
        expect(links.releaseTurnLock).toHaveBeenCalledWith(1, lastRequest.request_id);
        expect(usage.markFailed).not.toHaveBeenCalled();
        expect(JSON.stringify((Logger.prototype.error as jest.Mock).mock.calls)).not.toContain(
            'secret-token'
        );
    });

    it('콜백 없는 일반 요청은 실패 안내이고 차감하지 않는다', async () => {
        const res = await chat()
            .send({ ...payload, userRequest: { ...payload.userRequest, callbackUrl: undefined } })
            .expect(200);
        expect(res.body).toHaveProperty(
            'template.outputs.0.textCard.description',
            KAKAO_MESSAGES.AI_FAILED
        );
        expect(usage.consume).not.toHaveBeenCalled();
    });

    it('실제 접수 timeout에서도 예약은 유지한다', async () => {
        delayResponse = true;
        const budget = jest.spyOn(app.get(KakaoSkillFacade), 'remaining').mockReturnValue(30);
        try {
            const res = await chat().send(payload).expect(200);
            expect(res.body).toHaveProperty('useCallback', true);
            expect(usage.markFailed).not.toHaveBeenCalled();
        } finally {
            budget.mockRestore();
        }
    });

    it('완료 API는 API 키 없으면 401이다', async () => {
        await request(app.getHttpServer() as App)
            .post('/api/v1/kakao/turn-complete')
            .send(completion())
            .expect(401);
        expect(links.releaseTurnLock).not.toHaveBeenCalled();
    });

    it.each([
        { user_id: '0' },
        { user_id: '2147483648' },
        { user_id: 1 },
        { request_id: 'invalid' },
        { outcome: 'EXPIRED' },
        { delivery_status: 'invalid' },
        { unknown: true },
    ])('완료 DTO 오류 %j는 400으로 거부한다', async (invalid) => {
        await complete()
            .send({ ...completion(), ...invalid })
            .expect(400);
        expect(links.releaseTurnLock).not.toHaveBeenCalled();
    });

    it('성공 완료는 전달 실패여도 한도를 유지하고 CommonResponse로 응답한다', async () => {
        const body = { ...completion(), delivery_status: 'FAIL' };
        const res = await complete().send(body).expect(200);
        expect(res.body).toMatchObject({
            isSuccess: true,
            result: '카카오 턴 완료를 확인했습니다.',
        });
        expect(links.releaseTurnLock).toHaveBeenCalledWith(1, body.request_id);
        expect(usage.markFailed).not.toHaveBeenCalled();
    });

    it('실패 완료는 usage/failed 호출 누락 시에도 한도를 복구한다', async () => {
        const body = { ...completion(), outcome: 'FAILED' };
        await complete().send(body).expect(200);
        expect(usage.markFailed).toHaveBeenCalledWith(1, body.request_id, expect.any(Number));
        expect(links.releaseTurnLock).toHaveBeenCalledWith(1, body.request_id);
    });
});
