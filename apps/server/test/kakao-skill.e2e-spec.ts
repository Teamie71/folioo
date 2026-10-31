jest.mock('typeorm-transactional', () => ({ Transactional: () => () => undefined }));
import { AiExperienceSessionService } from 'src/modules/block/application/services/ai-experience-session.service';
import { AiAgentUsageService } from 'src/modules/block/application/services/ai-agent-usage.service';
import { KakaoTurnService } from 'src/modules/kakao-channel/application/services/kakao-turn.service';
import { Test } from '@nestjs/testing';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD, HttpAdapterHost, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { AuthTokenStoreService } from '../src/modules/auth/infrastructure/services/auth-token-store.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { UserService } from '../src/modules/user/application/services/user.service';
import { User } from '../src/modules/user/domain/user.entity';
import { UserStatus } from '../src/modules/user/domain/enums/user-status.enum';
import { KakaoChannelLinkService } from '../src/modules/kakao-channel/application/services/kakao-channel-link.service';
import { KakaoSkillFacade } from '../src/modules/kakao-channel/application/facades/kakao-skill.facade';
import { KAKAO_MESSAGES } from '../src/modules/kakao-channel/application/kakao-messages';
import {
    linkCardResponse,
    textResponse,
} from '../src/modules/kakao-channel/application/kakao-skill-response';
import { KakaoSkillController } from '../src/modules/kakao-channel/presentation/kakao-skill.controller';
import { BlockService } from '../src/modules/block/application/services/block.service';
import { Block } from '../src/modules/block/domain/block.entity';
import { BlockKind } from '../src/modules/block/domain/enums/block-kind.enum';
import { KakaoChannelLink } from '../src/modules/kakao-channel/domain/kakao-channel-link.entity';

describe('Kakao skill HTTP contract', () => {
    let app: INestApplication;
    let config: ConfigService;
    const users = { findByKakaoLoginId: jest.fn(), findByIdOrThrow: jest.fn() };
    const links = {
        findByKakaoAppUserId: jest.fn(),
        link: jest.fn(),
        selectBlock: jest.fn(),
        setQueryTimeout: jest.fn().mockResolvedValue(undefined),
        isTurnInProgress: (link: KakaoChannelLink) =>
            KakaoChannelLinkService.prototype.isTurnInProgress(link),
    };
    const blocks = { findRecentExperiences: jest.fn(), findExperience: jest.fn() };
    let errorLog: jest.SpyInstance;
    const guideUrl = 'https://example.test/login';
    const payload = {
        bot: { id: 'test-bot', name: 'extra field' },
        userRequest: {
            utterance: '경험 정리',
            user: { properties: { appUserId: 'k1' }, extra: true },
            timezone: 'Asia/Seoul',
        },
        action: { name: 'chat', params: {} },
        extra: true,
    };

    beforeAll(async () => {
        errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        config = new ConfigService({});
        const module = await Test.createTestingModule({
            controllers: [KakaoSkillController],
            providers: [
                KakaoSkillFacade,
                { provide: AiExperienceSessionService, useValue: { getOrCreate: jest.fn() } },
                { provide: AiAgentUsageService, useValue: {} },
                { provide: KakaoTurnService, useValue: {} },
                { provide: ConfigService, useValue: config },
                { provide: UserService, useValue: users },
                { provide: KakaoChannelLinkService, useValue: links },
                { provide: BlockService, useValue: blocks },
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
        jest.spyOn(app.get(KakaoSkillFacade), 'submit').mockResolvedValue(
            textResponse(KAKAO_MESSAGES.ACCEPTED)
        );
    });

    beforeEach(() => {
        jest.clearAllMocks();
        config.set('KAKAO_SKILL_SECRET', 'test-secret');
        config.set('KAKAO_BOT_ID', 'test-bot');
        config.set('KAKAO_WEB_GUIDE_URL', guideUrl);
        config.set('KAKAO_WEB_ACTIVITY_LIST_URL', 'https://example.test/activities');
        config.set('KAKAO_WEB_EXPERIENCE_URL', 'https://example.test/experience');
        config.set('KAKAO_SELECT_ACTIVITY_BLOCK_ID', 'select-block');
        links.findByKakaoAppUserId.mockReset().mockResolvedValue(null);
        links.link.mockReset().mockResolvedValue(KakaoChannelLink.create(1, 'k1'));
        links.selectBlock.mockReset().mockResolvedValue(true);
        blocks.findRecentExperiences
            .mockReset()
            .mockResolvedValue([{ id: '12', name: '프로젝트' }]);
        blocks.findExperience.mockReset().mockResolvedValue(
            Object.assign(new Block(), {
                id: '12',
                kind: BlockKind.EXPERIENCE,
                content: '프로젝트',
            })
        );
        users.findByKakaoLoginId.mockReset().mockResolvedValue(null);
        users.findByIdOrThrow.mockReset();
    });

    afterAll(async () => {
        await app.close();
        jest.restoreAllMocks();
    });

    function post(secret = 'test-secret') {
        return request(app.getHttpServer() as App)
            .post('/kakao/skill/chat')
            .set('x-kakao-skill-secret', secret);
    }

    it('AC-1-1: 시크릿 누락은 401', async () => {
        await request(app.getHttpServer() as App)
            .post('/kakao/skill/chat')
            .send(payload)
            .expect(401);
        expect(links.findByKakaoAppUserId).not.toHaveBeenCalled();
    });

    it.each(['wrong-secret', 'same-length'])('AC-1-1: 틀린 시크릿 %s는 401', async (secret) => {
        await post(secret).send(payload).expect(401);
        expect(links.findByKakaoAppUserId).not.toHaveBeenCalled();
    });

    it.each([{ id: 'another-bot' }, {}])('AC-1-2: 봇 ID 누락·불일치는 401', async (bot) => {
        await post()
            .send({ ...payload, bot })
            .expect(401);
    });

    it.each(['KAKAO_SKILL_SECRET', 'KAKAO_BOT_ID'])(
        'AC-1-3: %s 미설정은 500 + 로그',
        async (key) => {
            config.set(key, '');
            await post().send(payload).expect(500);
            expect(errorLog).toHaveBeenCalledWith(
                'KAKAO_SKILL_SECRET/KAKAO_BOT_ID is not configured'
            );
        }
    );

    it('AC-1-4/12: 추가 필드·JWT 없는 요청은 200 + 래핑 없는 연결 카드', async () => {
        const response = await post().send(payload).expect(200);
        expect(response.body).toEqual(linkCardResponse(KAKAO_MESSAGES.UNLINKED, guideUrl));
    });

    it('appUserId가 없으면 사용자 조회 없이 연결 카드', async () => {
        const response = await post().send({ bot: payload.bot, userRequest: {} }).expect(200);
        expect(response.body).toEqual(linkCardResponse(KAKAO_MESSAGES.UNLINKED, guideUrl));
        expect(links.findByKakaoAppUserId).not.toHaveBeenCalled();
    });

    it.each([UserStatus.PENDING, UserStatus.ACTIVE])(
        'AC-1-13/14: %s 사용자는 해당 카카오 응답을 받는다',
        async (status) => {
            users.findByKakaoLoginId.mockResolvedValue(
                Object.assign(new User(), { id: 1, status, isActive: true })
            );
            const selected = KakaoChannelLink.create(1, 'k1');
            selected.currentBlockId = '12';
            selected.activitySelectedAt = new Date();
            links.link.mockResolvedValue(selected);
            const response = await post().send(payload).expect(200);
            expect(response.body).toEqual(
                status === UserStatus.PENDING
                    ? linkCardResponse(KAKAO_MESSAGES.PENDING, guideUrl)
                    : textResponse(KAKAO_MESSAGES.ACCEPTED)
            );
        }
    );

    it.each(['조회', '저장'])('AC-1-15: %s 실패는 200 + 오류 문구 + 로그', async (step) => {
        const error = new Error('database unavailable');
        if (step === '조회') {
            links.findByKakaoAppUserId.mockRejectedValue(error);
        } else {
            users.findByKakaoLoginId.mockResolvedValue(
                Object.assign(new User(), { id: 1, status: UserStatus.ACTIVE, isActive: true })
            );
            links.link.mockRejectedValue(error);
        }
        const response = await post().send(payload).expect(200);
        expect(response.body).toEqual(textResponse(KAKAO_MESSAGES.ERROR));
        expect(errorLog).toHaveBeenCalledWith('Kakao chat skill failed');
    });

    it('안내 URL 미설정도 200 + 오류 안내', async () => {
        config.set('KAKAO_WEB_GUIDE_URL', undefined);
        // ConfigService.set은 process.env에도 값을 쓰므로 문자열 "undefined"도 제거한다.
        delete process.env.KAKAO_WEB_GUIDE_URL;
        const response = await post().send(payload).expect(200);
        expect(response.body).toEqual(textResponse(KAKAO_MESSAGES.ERROR));
        expect(errorLog).toHaveBeenCalled();
    });

    it.each([KAKAO_MESSAGES.UNLINKED, KAKAO_MESSAGES.PENDING])(
        '회원 카드 제한을 지킨다: $title',
        (card) => {
            expect(card.title.length).toBeLessThanOrEqual(50);
            expect(card.description.length).toBeLessThanOrEqual(230);
        }
    );

    it.each(['activities', 'select-activity'])('%s도 동일한 스킬 인증이 필요하다', async (path) => {
        await request(app.getHttpServer() as App)
            .post(`/kakao/skill/${path}`)
            .send(payload)
            .expect(401);
    });

    it.each(['activities', 'select-activity'])(
        '미연결 사용자의 %s는 JWT 없이 안내 카드를 받는다',
        async (path) => {
            const response = await request(app.getHttpServer() as App)
                .post(`/kakao/skill/${path}`)
                .set('x-kakao-skill-secret', 'test-secret')
                .send(payload)
                .expect(200);
            expect(response.body).toEqual(linkCardResponse(KAKAO_MESSAGES.UNLINKED, guideUrl));
            expect(blocks.findRecentExperiences).not.toHaveBeenCalled();
            expect(links.selectBlock).not.toHaveBeenCalled();
        }
    );

    it('activities는 최근 활동 버튼과 웹 이동 버튼을 카카오 포맷으로 반환한다', async () => {
        users.findByKakaoLoginId.mockResolvedValue(
            Object.assign(new User(), { id: 1, status: UserStatus.ACTIVE, isActive: true })
        );
        const response = await request(app.getHttpServer() as App)
            .post('/kakao/skill/activities')
            .set('x-kakao-skill-secret', 'test-secret')
            .send(payload)
            .expect(200);
        expect(response.body).toEqual({
            version: '2.0',
            template: {
                outputs: [
                    {
                        textCard: {
                            description: KAKAO_MESSAGES.SELECT_ACTIVITY,
                            buttons: [
                                {
                                    action: 'webLink',
                                    label: '웹에서 활동 보기',
                                    webLinkUrl: 'https://example.test/experience',
                                },
                            ],
                        },
                    },
                ],
                quickReplies: [
                    {
                        label: '프로젝트',
                        action: 'block',
                        blockId: 'select-block',
                        extra: { block_id: '12' },
                    },
                ],
            },
        });
    });

    it('select-activity는 clientExtra.block_id로 소유권을 확인하고 선택한다', async () => {
        users.findByKakaoLoginId.mockResolvedValue(
            Object.assign(new User(), { id: 1, status: UserStatus.ACTIVE, isActive: true })
        );
        const response = await request(app.getHttpServer() as App)
            .post('/kakao/skill/select-activity')
            .set('x-kakao-skill-secret', 'test-secret')
            .send({ ...payload, action: { clientExtra: { block_id: '12' }, extra: true } })
            .expect(200);
        expect(response.body).toEqual(textResponse(KAKAO_MESSAGES.ACTIVITY_SELECTED('프로젝트')));
        expect(blocks.findExperience).toHaveBeenCalledWith('12', 1);
        expect(links.selectBlock).toHaveBeenCalledWith(1, '12');
    });

    it('삭제된 활동과 최초 미선택은 다른 안내를 응답한다', async () => {
        const link = KakaoChannelLink.create(1, 'k1');
        link.activitySelectedAt = new Date();
        links.findByKakaoAppUserId.mockResolvedValue(link);
        users.findByIdOrThrow.mockResolvedValue(
            Object.assign(new User(), { id: 1, status: UserStatus.ACTIVE, isActive: true })
        );
        const response = await post().send(payload).expect(200);
        expect(response.body).toEqual({
            version: '2.0',
            template: {
                outputs: [
                    {
                        textCard: {
                            description: KAKAO_MESSAGES.ACTIVITY_NOT_FOUND,
                            buttons: [
                                {
                                    action: 'message',
                                    label: '활동 다시 선택',
                                    messageText: '/활동변경',
                                },
                            ],
                        },
                    },
                ],
            },
        });
    });

    it.each(['chat', 'activities', 'select-activity'])(
        '잠금 중 %s는 처리 중 문구를 반환한다',
        async (path) => {
            const link = KakaoChannelLink.create(1, 'k1');
            link.turnLockedUntil = new Date(Date.now() + 60_000);
            links.findByKakaoAppUserId.mockResolvedValue(link);
            users.findByIdOrThrow.mockResolvedValue(
                Object.assign(new User(), { id: 1, status: UserStatus.ACTIVE, isActive: true })
            );
            const response = await request(app.getHttpServer() as App)
                .post(`/kakao/skill/${path}`)
                .set('x-kakao-skill-secret', 'test-secret')
                .send(payload)
                .expect(200);
            expect(response.body).toEqual(textResponse(KAKAO_MESSAGES.TURN_IN_PROGRESS));
            expect(links.selectBlock).not.toHaveBeenCalled();
        }
    );
});
