import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import {
    initializeTransactionalContext,
    addTransactionalDataSource,
    deleteDataSourceByName,
} from 'typeorm-transactional';
import { KakaoChannelLink } from '../src/modules/kakao-channel/domain/kakao-channel-link.entity';
import { KakaoChannelLinkService } from '../src/modules/kakao-channel/application/services/kakao-channel-link.service';
import { KakaoChannelLinkRepository } from '../src/modules/kakao-channel/infrastructure/repositories/kakao-channel-link.repository';
import { KakaoSkillFacade } from '../src/modules/kakao-channel/application/facades/kakao-skill.facade';
import { KakaoTurnService } from '../src/modules/kakao-channel/application/services/kakao-turn.service';
import { AiAgentUsage } from '../src/modules/block/domain/ai-agent-usage.entity';
import { AiAgentUsageRepository } from '../src/modules/block/infrastructure/repositories/ai-agent-usage.repository';
import {
    AiAgentUsageService,
    AI_AGENT_DAILY_LIMIT,
} from '../src/modules/block/application/services/ai-agent-usage.service';
import { AiExperienceSessionService } from '../src/modules/block/application/services/ai-experience-session.service';
import { AiExperienceSession } from '../src/modules/block/domain/ai-experience-session.entity';
import { AiExperienceSessionRepository } from '../src/modules/block/infrastructure/repositories/ai-experience-session.repository';
import { AiRelayPort } from '../src/common/ports/ai-relay.port';
import { BlockService } from '../src/modules/block/application/services/block.service';
import { UserService } from '../src/modules/user/application/services/user.service';
import { User } from '../src/modules/user/domain/user.entity';
import { UserStatus } from '../src/modules/user/domain/enums/user-status.enum';
import { getSeoulDateString } from '../src/common/utils/seoul-date.util';
import { ExperienceMapTicketFacade } from '../src/modules/block/application/facades/experience-map-ticket.facade';
import { ExperienceMapTicketService } from '../src/modules/block/application/services/experience-map-ticket.service';

const databaseUrl = process.env.KAKAO_TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('Kakao turn PostgreSQL transactions', () => {
    let db: DataSource;
    let links: KakaoChannelLinkService;
    let usage: AiAgentUsageService;
    let facade: KakaoSkillFacade;
    const relay = { postJson: jest.fn(), getJson: jest.fn() };
    const turns = new KakaoTurnService(relay as unknown as AiRelayPort);
    const session = { getOrCreate: jest.fn() };
    const blocks = { findExperienceOrThrow: jest.fn() };
    const users = { findByIdOrThrow: jest.fn() };
    const config = new ConfigService({
        KAKAO_WEB_EXPERIENCE_URL: 'https://folioo.test/experience',
    });
    const createFacade = () =>
        new KakaoSkillFacade(
            users as unknown as UserService,
            links,
            config,
            blocks as unknown as BlockService,
            session as unknown as AiExperienceSessionService,
            usage,
            turns
        );
    const payload = {
        userRequest: {
            utterance: '축제 부스 운영',
            callbackUrl: 'https://bot-api.kakao.com/v1/callback/test-token',
        },
    };

    beforeAll(async () => {
        const url = new URL(databaseUrl!);
        if (
            !['localhost', '127.0.0.1'].includes(url.hostname) ||
            url.pathname !== '/kakao_skill_test'
        ) {
            throw new Error('Only an isolated local kakao_skill_test database is allowed');
        }
        initializeTransactionalContext();
        db = addTransactionalDataSource(
            new DataSource({
                type: 'postgres',
                url: databaseUrl,
                entities: [KakaoChannelLink, AiAgentUsage, AiExperienceSession, User],
                synchronize: false,
                namingStrategy: new SnakeNamingStrategy(),
            })
        );
        await db.initialize();
        await db.query('CREATE TABLE users (id INT PRIMARY KEY)');
        await db.query('CREATE TABLE block (id BIGINT PRIMARY KEY)');
        for (const file of [
            '20261001120000_create_kakao_channel_link.sql',
            '20260918140000_create_ai_agent_usage.sql',
        ]) {
            await db.query(readFileSync(join(__dirname, '../supabase/migrations', file), 'utf8'));
        }
        await db.query(`CREATE TABLE ai_experience_session (
            user_id INT NOT NULL REFERENCES users(id), block_id BIGINT NOT NULL REFERENCES block(id),
            session_id UUID NOT NULL UNIQUE, active_gap JSONB, last_seen_request_id UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (user_id, block_id)
        )`);
        links = new KakaoChannelLinkService(
            new KakaoChannelLinkRepository(db.getRepository(KakaoChannelLink))
        );
        usage = new AiAgentUsageService(new AiAgentUsageRepository(db.getRepository(AiAgentUsage)));
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await db.query('TRUNCATE users, block CASCADE');
        await db.query('INSERT INTO users (id) VALUES (1), (2)');
        await db.query('INSERT INTO block (id) VALUES (12), (13)');
        await links.link(1, 'k1');
        await links.selectBlock(1, '12');
        session.getOrCreate.mockReset().mockResolvedValue({ sessionId: randomUUID() });
        users.findByIdOrThrow
            .mockReset()
            .mockResolvedValue(
                Object.assign(new User(), { id: 1, status: UserStatus.ACTIVE, isActive: true })
            );
        blocks.findExperienceOrThrow.mockReset().mockResolvedValue({ id: '12' });
        relay.postJson.mockReset().mockResolvedValue({ status: 202 });
        relay.getJson.mockReset().mockResolvedValue({ status: 404 });
        facade = createFacade();
    });

    afterAll(async () => {
        jest.restoreAllMocks();
        if (db?.isInitialized) {
            await db.query(
                'DROP TABLE ai_experience_session, ai_agent_usage, kakao_channel_link, block, users'
            );
            await db.destroy();
            deleteDataSourceByName('default');
        }
    });

    const seedUsed = async (count: number) => {
        const repository = db.getRepository(AiAgentUsage);
        for (let i = 0; i < count; i++) {
            await repository.save(
                Object.assign(new AiAgentUsage(), {
                    userId: 1,
                    requestId: randomUUID(),
                    usageDate: getSeoulDateString(new Date()),
                    failed: false,
                })
            );
        }
    };

    it('동시 카톡 예약은 한 요청만 잠금과 사용량을 획득한다', async () => {
        const results = await Promise.all([
            facade.reserve(1, '12', randomUUID(), 1000),
            facade.reserve(1, '12', randomUUID(), 1000),
        ]);
        expect(results.sort()).toEqual([false, true]);
        expect((await usage.getSummary(1)).used).toBe(1);
    });

    it('웹·카톡의 마지막 한도 동시 예약은 합산 한도를 넘지 않는다', async () => {
        await seedUsed(AI_AGENT_DAILY_LIMIT - 1);
        const results = await Promise.allSettled([
            usage.consume(1, randomUUID()),
            facade.reserve(1, '12', randomUUID(), 1000),
        ]);
        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
        expect((await usage.getSummary(1)).used).toBe(AI_AGENT_DAILY_LIMIT);
        if (results[1].status === 'rejected')
            expect((await links.findByUserId(1))?.turnRequestId).toBeNull();
    });

    it('consume 실패는 잠금 UPDATE도 롤백하고 AI 호출을 막는다', async () => {
        await seedUsed(AI_AGENT_DAILY_LIMIT);
        const result = await facade.submit(1, '12', payload, Date.now());
        expect(result).toHaveProperty('template');
        expect((await links.findByUserId(1))?.turnRequestId).toBeNull();
        expect(relay.postJson).not.toHaveBeenCalled();
    });

    it('AI 호출 시점에는 별도 연결에서도 예약과 잠금을 조회할 수 있다', async () => {
        relay.postJson.mockImplementation(async (request: { body: { request_id: string } }) => {
            const runner = db.createQueryRunner();
            await runner.connect();
            try {
                const rows = (await runner.query(
                    `SELECT l.turn_request_id, u.request_id FROM kakao_channel_link l JOIN ai_agent_usage u ON l.user_id=u.user_id AND l.turn_request_id=u.request_id`
                )) as { turn_request_id: string; request_id: string }[];
                expect(rows).toEqual([
                    {
                        turn_request_id: request.body.request_id,
                        request_id: request.body.request_id,
                    },
                ]);
            } finally {
                await runner.release();
            }
            // 접수 응답보다 빠른 AI 완료도 이미 COMMIT된 예약을 정리한다.
            await facade.complete({
                user_id: '1',
                request_id: request.body.request_id,
                outcome: 'SUCCEEDED',
                delivery_status: 'SUCCESS',
            });
            return { status: 202 };
        });
        expect(await facade.submit(1, '12', payload, Date.now())).toHaveProperty(
            'useCallback',
            true
        );
        expect((await links.findByUserId(1))?.turnRequestId).toBeNull();
        expect((await usage.getSummary(1)).used).toBe(1);
    });

    it('202 응답 유실은 예약을 유지하고 AI 상태 조회로 성공을 정리한다', async () => {
        relay.postJson.mockRejectedValue(new Error('response lost'));
        expect(await facade.submit(1, '12', payload, Date.now())).toHaveProperty(
            'useCallback',
            true
        );
        const requestId = (await links.findByUserId(1))!.turnRequestId!;
        expect((await usage.getSummary(1)).used).toBe(1);
        relay.getJson.mockResolvedValue({
            status: 200,
            data: { request_id: requestId, state: 'SUCCEEDED', delivery_status: 'FAIL' },
        });
        await createFacade().recoverPending();
        expect((await links.findByUserId(1))?.turnRequestId).toBeNull();
        expect((await usage.getSummary(1)).used).toBe(1);
    });

    it('확정 미접수는 한도 복구와 잠금 해제를 함께 커밋한다', async () => {
        relay.postJson.mockResolvedValue({ status: 404 });
        expect(await facade.submit(1, '12', payload, Date.now())).toHaveProperty('template');
        expect((await usage.getSummary(1)).used).toBe(0);
        expect((await links.findByUserId(1))?.turnRequestId).toBeNull();
    });

    it('완료 정리 실패는 한도 복구도 롤백하고 재시도 때 한 번만 복구한다', async () => {
        const requestId = randomUUID();
        await facade.reserve(1, '12', requestId, 1000);
        const body = {
            user_id: '1',
            request_id: requestId,
            outcome: 'FAILED' as const,
            delivery_status: 'FAIL' as const,
        };
        const spy = jest
            .spyOn(links, 'releaseTurnLock')
            .mockRejectedValueOnce(new Error('db failed'));
        await expect(facade.complete(body)).rejects.toThrow();
        expect((await usage.getSummary(1)).used).toBe(1);
        expect((await links.findByUserId(1))?.turnRequestId).toBe(requestId);
        spy.mockRestore();
        await facade.complete(body);
        await facade.complete(body);
        expect((await usage.getSummary(1)).used).toBe(0);
        expect((await links.findByUserId(1))?.turnRequestId).toBeNull();
    });

    it('늦은 이전 턴 실패는 새 잠금을 풀지 않고 이전 사용량만 복구한다', async () => {
        const oldRequestId = randomUUID();
        const newRequestId = randomUUID();
        await facade.reserve(1, '12', oldRequestId, 1000);
        await db.query("UPDATE kakao_channel_link SET turn_locked_until=now()-interval '1 second'");
        await facade.reserve(1, '12', newRequestId, 1000);
        await facade.complete({
            user_id: '1',
            request_id: oldRequestId,
            outcome: 'FAILED',
            delivery_status: 'FAIL',
        });
        expect((await links.findByUserId(1))?.turnRequestId).toBe(newRequestId);
        expect((await usage.getSummary(1)).used).toBe(1);
    });

    it('예약 이후 활동 변경은 거부하고 예약 전 선택이 바뀌면 차감하지 않는다', async () => {
        await links.selectBlock(1, '13');
        expect(await facade.reserve(1, '12', randomUUID(), 1000)).toBe(false);
        expect((await usage.getSummary(1)).used).toBe(0);
        await facade.reserve(1, '13', randomUUID(), 1000);
        expect(await links.selectBlock(1, '12')).toBe(false);
        expect((await links.findByUserId(1))?.currentBlockId).toBe('13');
    });

    it('커밋 불명·상태 404·만료만으로는 사용량을 환불하지 않는다', async () => {
        const requestId = randomUUID();
        await facade.reserve(1, '12', requestId, 1000);
        await facade.complete({
            user_id: '1',
            request_id: requestId,
            outcome: 'COMMIT_UNKNOWN',
            delivery_status: 'UNKNOWN',
        });
        await db.query("UPDATE kakao_channel_link SET turn_locked_until=now()-interval '1 second'");
        await facade.recoverPending();
        expect((await links.findByUserId(1))?.turnRequestId).toBe(requestId);
        expect((await usage.getSummary(1)).used).toBe(1);
    });

    it('사용자 DB 잠금 대기는 호출별 예산에서 끊고 예약을 남기지 않는다', async () => {
        const runner = db.createQueryRunner();
        await runner.connect();
        await runner.startTransaction();
        await runner.query('SELECT pg_advisory_xact_lock(73104, 1)');
        const startedAt = Date.now();
        try {
            await expect(facade.reserve(1, '12', randomUUID(), 80)).rejects.toThrow();
            expect(Date.now() - startedAt).toBeLessThan(500);
            expect((await links.findByUserId(1))?.turnRequestId).toBeNull();
        } finally {
            await runner.rollbackTransaction();
            await runner.release();
        }
    });

    it('동시 세션 확보는 같은 활동의 저장된 세션을 재사용하고 AI의 active_gap을 보존한다', async () => {
        const ai = {
            postJson: jest
                .fn()
                .mockImplementation(() =>
                    Promise.resolve({ status: 200, data: { session_id: randomUUID() } })
                ),
        };
        const service = new AiExperienceSessionService(
            new AiExperienceSessionRepository(db.getRepository(AiExperienceSession)),
            ai as unknown as AiRelayPort
        );
        const [a, b] = await Promise.all([
            service.getOrCreate(1, '12', 1000),
            service.getOrCreate(1, '12', 1000),
        ]);
        expect(a.sessionId).toBe(b.sessionId);
        expect(await db.getRepository(AiExperienceSession).count()).toBe(1);
        await db.query(`UPDATE ai_experience_session SET active_gap='{"kept":true}'::jsonb`);
        expect((await service.getOrCreate(1, '12')).activeGap).toEqual({ kept: true });
    });

    it('웹 세션 확보는 트랜잭션 밖이며 티켓 서명 실패는 사용량을 롤백한다', async () => {
        session.getOrCreate.mockImplementation(() => {
            expect(db.manager.queryRunner?.isTransactionActive).not.toBe(true);
            return Promise.resolve({ sessionId: randomUUID() });
        });
        const tickets = new ExperienceMapTicketFacade(
            blocks as unknown as BlockService,
            session as unknown as AiExperienceSessionService,
            {
                issueTicket: () => {
                    throw new Error('signing failed');
                },
            } as unknown as ExperienceMapTicketService,
            usage
        );
        await expect(tickets.issueTicket(1, '12')).rejects.toThrow('signing failed');
        expect((await usage.getSummary(1)).used).toBe(0);
    });
});
