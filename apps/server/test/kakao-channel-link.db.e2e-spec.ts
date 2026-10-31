import { AiExperienceSessionService } from 'src/modules/block/application/services/ai-experience-session.service';
import { AiAgentUsageService } from 'src/modules/block/application/services/ai-agent-usage.service';
import { KakaoTurnService } from 'src/modules/kakao-channel/application/services/kakao-turn.service';
import { readFileSync } from 'node:fs';
import { BlockService } from '../src/modules/block/application/services/block.service';
import { BlockRepository } from '../src/modules/block/infrastructure/repositories/block.repository';
import { Block } from '../src/modules/block/domain/block.entity';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
    initializeTransactionalContext,
    addTransactionalDataSource,
    deleteDataSourceByName,
} from 'typeorm-transactional';
import { KakaoLinkFacade } from '../src/modules/kakao-channel/application/facades/kakao-link.facade';
import { KakaoLinkTokenService } from '../src/modules/kakao-channel/application/services/kakao-link-token.service';
import { KakaoOAuthClient } from '../src/modules/kakao-channel/infrastructure/clients/kakao-oauth.client';
import { BusinessException } from '../src/common/exceptions/business.exception';
import { ErrorCode } from '../src/common/exceptions/error-code.enum';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { KakaoChannelLink } from '../src/modules/kakao-channel/domain/kakao-channel-link.entity';
import { KakaoChannelLinkRepository } from '../src/modules/kakao-channel/infrastructure/repositories/kakao-channel-link.repository';
import { KakaoChannelLinkService } from '../src/modules/kakao-channel/application/services/kakao-channel-link.service';
import { KakaoSkillFacade } from '../src/modules/kakao-channel/application/facades/kakao-skill.facade';
import { UserService } from '../src/modules/user/application/services/user.service';
import { User } from '../src/modules/user/domain/user.entity';
import { UserStatus } from '../src/modules/user/domain/enums/user-status.enum';
import { textCardResponse } from '../src/modules/kakao-channel/application/kakao-skill-response';
import { KAKAO_MESSAGES } from '../src/modules/kakao-channel/application/kakao-messages';

const databaseUrl = process.env.KAKAO_TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('Kakao channel link PostgreSQL contract', () => {
    let db: DataSource;
    let service: KakaoChannelLinkService;
    const tokens = new KakaoLinkTokenService(new JwtService({ secret: 'db-link-test' }));
    let linkFacade: KakaoLinkFacade;
    const users = {
        findByKakaoLoginId: jest.fn(),
        findByIdOrThrow: jest.fn(),
        findKakaoLoginIdByUserId: jest.fn(),
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
                entities: [KakaoChannelLink],
                synchronize: false,
                namingStrategy: new SnakeNamingStrategy(),
            })
        );
        await db.initialize();
        // 전체 운영 스키마 대신 FK 대상의 실제 키 타입을 재현한다.
        await db.query('CREATE TABLE users (id INT PRIMARY KEY)');
        await db.query(
            `CREATE TABLE block (id BIGINT PRIMARY KEY, user_id INT, parent_id BIGINT REFERENCES block(id) ON DELETE CASCADE, kind TEXT, content TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`
        );
        await db.query(
            readFileSync(
                join(
                    __dirname,
                    '../supabase/migrations/20261001120000_create_kakao_channel_link.sql'
                ),
                'utf8'
            )
        );
        service = new KakaoChannelLinkService(
            new KakaoChannelLinkRepository(db.getRepository(KakaoChannelLink))
        );
        linkFacade = new KakaoLinkFacade(
            users as unknown as UserService,
            service,
            tokens,
            {} as KakaoOAuthClient,
            new ConfigService({})
        );
    });

    beforeEach(async () => {
        await db.query('TRUNCATE users, block CASCADE');
        await db.query('INSERT INTO users (id) VALUES (1), (2)');
        await db.query('INSERT INTO block (id) VALUES (9007199254740993), (12)');
        users.findByKakaoLoginId.mockReset().mockResolvedValue(null);
        users.findKakaoLoginIdByUserId.mockReset().mockResolvedValue(null);
        users.findByIdOrThrow
            .mockReset()
            .mockImplementation((id: number) =>
                Promise.resolve(
                    Object.assign(new User(), { id, status: UserStatus.ACTIVE, isActive: true })
                )
            );
    });

    afterAll(async () => {
        if (db?.isInitialized) {
            await db.query('DROP TABLE kakao_channel_link, block, users');
            await db.destroy();
            deleteDataSourceByName('default');
        }
    });

    it('마이그레이션의 전체 컬럼·타입·NULL 제약을 확인한다', async () => {
        const columns: { column_name: string; data_type: string; is_nullable: string }[] =
            await db.query(
                "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'kakao_channel_link' ORDER BY ordinal_position"
            );
        expect(columns).toEqual([
            { column_name: 'user_id', data_type: 'integer', is_nullable: 'NO' },
            { column_name: 'kakao_app_user_id', data_type: 'character varying', is_nullable: 'NO' },
            { column_name: 'current_block_id', data_type: 'bigint', is_nullable: 'YES' },
            {
                column_name: 'activity_selected_at',
                data_type: 'timestamp with time zone',
                is_nullable: 'YES',
            },
            { column_name: 'turn_request_id', data_type: 'uuid', is_nullable: 'YES' },
            {
                column_name: 'turn_locked_until',
                data_type: 'timestamp with time zone',
                is_nullable: 'YES',
            },
            { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'NO' },
            { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'NO' },
        ]);
    });

    it('user_id PK·카카오 ID UNIQUE·FK가 적용된다', async () => {
        await service.link(1, 'k1');
        await expect(
            db.query("INSERT INTO kakao_channel_link (user_id, kakao_app_user_id) VALUES (1, 'k2')")
        ).rejects.toMatchObject({ code: '23505' });
        await expect(
            db.query("INSERT INTO kakao_channel_link (user_id, kakao_app_user_id) VALUES (2, 'k1')")
        ).rejects.toMatchObject({ code: '23505' });
        await expect(
            db.query("INSERT INTO kakao_channel_link (user_id, kakao_app_user_id) VALUES (3, 'k3')")
        ).rejects.toMatchObject({ code: '23503' });
        await expect(service.selectBlock(1, '999')).rejects.toMatchObject({ code: '23503' });
    });

    it('AC-1-11: 동시 첫 메시지는 둘 다 정상 응답하고 연결 행은 하나만 저장한다', async () => {
        const user = Object.assign(new User(), {
            id: 1,
            status: UserStatus.ACTIVE,
            isActive: true,
        });
        const facade = new KakaoSkillFacade(
            {
                findByKakaoLoginId: () => Promise.resolve(user),
                findByIdOrThrow: () => Promise.resolve(user),
            } as unknown as UserService,
            service,
            new ConfigService({
                KAKAO_WEB_GUIDE_URL: 'https://example.test/login',
                KAKAO_WEB_ACTIVITY_LIST_URL: 'https://example.test/activities',
            }),
            { findRecentExperiences: () => Promise.resolve([]) } as unknown as BlockService,
            {} as AiExperienceSessionService,
            {} as AiAgentUsageService,
            {} as KakaoTurnService
        );
        // 두 요청 모두 미연결 조회를 마친 뒤 INSERT하도록 동시 충돌을 재현한다.
        const repository = new KakaoChannelLinkRepository(db.getRepository(KakaoChannelLink));
        let release!: () => void;
        const bothRead = new Promise<void>((resolve) => {
            release = resolve;
        });
        let reads = 0;
        const spy = jest.spyOn(service, 'findByKakaoAppUserId').mockImplementation(async (id) => {
            const link = await repository.findByKakaoAppUserId(id);
            reads += 1;
            if (reads === 2) release();
            await bothRead;
            return link;
        });
        try {
            const payload = { userRequest: { user: { properties: { appUserId: 'k1' } } } };
            const responses = await Promise.all([facade.chat(payload), facade.chat(payload)]);
            expect(responses).toEqual([
                textCardResponse(KAKAO_MESSAGES.NO_ACTIVITY, [
                    {
                        action: 'webLink',
                        label: '웹에서 활동 만들기',
                        webLinkUrl: 'https://example.test/activities',
                    },
                ]),
                textCardResponse(KAKAO_MESSAGES.NO_ACTIVITY, [
                    {
                        action: 'webLink',
                        label: '웹에서 활동 만들기',
                        webLinkUrl: 'https://example.test/activities',
                    },
                ]),
            ]);
            expect(await db.getRepository(KakaoChannelLink).count()).toBe(1);
        } finally {
            spy.mockRestore();
        }
    });

    it('최초 미선택은 삭제된 활동으로 판단하지 않는다', async () => {
        await service.link(1, 'k1');
        const link = await service.findByKakaoAppUserId('k1');
        expect(link?.currentBlockId).toBeNull();
        expect(link?.activitySelectedAt).toBeNull();
        expect(link?.hasDeletedActivity()).toBe(false);
    });

    it('선택한 활동 삭제 시 ID만 NULL이 되고 선택 시각은 유지된다', async () => {
        await service.link(1, 'k1');
        await service.selectBlock(1, '9007199254740993');
        const selected = await service.findByKakaoAppUserId('k1');
        expect(selected?.currentBlockId).toBe('9007199254740993');
        expect(selected?.activitySelectedAt).toBeInstanceOf(Date);
        expect(selected?.hasDeletedActivity()).toBe(false);
        await db.query('DELETE FROM block WHERE id = 9007199254740993');
        const deleted = await service.findByKakaoAppUserId('k1');
        expect(deleted?.currentBlockId).toBeNull();
        expect(deleted?.activitySelectedAt).toEqual(selected?.activitySelectedAt);
        expect(deleted?.hasDeletedActivity()).toBe(true);
        await service.selectBlock(1, '12');
        const reselected = await service.findByKakaoAppUserId('k1');
        expect(reselected?.currentBlockId).toBe('12');
        expect(reselected?.activitySelectedAt).toBeInstanceOf(Date);
        expect(reselected?.hasDeletedActivity()).toBe(false);
    });

    it('선택 초기화는 ID와 선택 시각을 모두 지운다', async () => {
        await service.link(1, 'k1');
        await service.selectBlock(1, '12');
        await service.resetSelection(1);
        const link = await service.findByKakaoAppUserId('k1');
        expect(link?.currentBlockId).toBeNull();
        expect(link?.activitySelectedAt).toBeNull();
        expect(link?.hasDeletedActivity()).toBe(false);
    });

    it('사용자 행 삭제 시 연결 행이 CASCADE 삭제된다', async () => {
        await service.link(1, 'k1');
        await db.query('DELETE FROM users WHERE id = 1');
        expect(await service.findByKakaoAppUserId('k1')).toBeNull();
    });

    it('AC-2-1: 소유 활동 12개에서 최근 10개만 반환하고 동률은 ID 내림차순이다', async () => {
        await db.query('TRUNCATE block CASCADE');
        await db.query(`INSERT INTO block (id, user_id, kind, content, updated_at)
            SELECT i, 1, 'EXPERIENCE', '활동 ' || i, '2026-09-30T00:00:00Z'::timestamptz
            FROM generate_series(1, 12) AS i`);
        await db.query(`INSERT INTO block (id, user_id, kind, content, updated_at)
            VALUES (20, 2, 'EXPERIENCE', '다른 사용자', '2026-10-01T00:00:00Z'),
                   (21, 1, 'GROUP', '그룹', '2026-10-01T00:00:00Z')`);
        const repository = new BlockRepository(db.getRepository(Block));
        const activities = await repository.findRecentExperiences(1, 10);
        expect(activities.map(({ id }) => id)).toEqual([
            '12',
            '11',
            '10',
            '9',
            '8',
            '7',
            '6',
            '5',
            '4',
            '3',
        ]);
        expect(activities[0].name).toBe('활동 12');
    });

    it('AC-2-2: 하위 트리 수정은 조상 활동의 최근 순서를 올리되 다른 사용자 수정은 제외한다', async () => {
        await db.query('TRUNCATE block CASCADE');
        await db.query(`INSERT INTO block (id, user_id, kind, parent_id, updated_at) VALUES
            (1, 1, 'EXPERIENCE', NULL, '2026-09-01T00:00:00Z'),
            (2, 1, 'EXPERIENCE', NULL, '2026-09-20T00:00:00Z'),
            (3, 1, 'SECTION_TASK', 1, '2026-09-01T00:00:00Z'),
            (4, 1, 'CONTENT', 3, '2026-09-30T00:00:00Z'),
            (5, 2, 'CONTENT', 2, '2026-10-01T00:00:00Z')`);
        const repository = new BlockRepository(db.getRepository(Block));
        expect((await repository.findRecentExperiences(1, 10)).map(({ id }) => id)).toEqual([
            '1',
            '2',
        ]);
        await db.query("UPDATE block SET updated_at = '2026-10-02T00:00:00Z' WHERE id = 2");
        expect((await repository.findRecentExperiences(1, 10)).map(({ id }) => id)).toEqual([
            '2',
            '1',
        ]);
    });

    it('AC-3-15: 웹에서 연결한 네이버 사용자도 스킬에서 LINKED로 식별한다', async () => {
        await linkFacade.link(1, tokens.signLinkToken(1, '123'));
        const skill = new KakaoSkillFacade(
            users as unknown as UserService,
            service,
            new ConfigService({}),
            {} as BlockService,
            {} as AiExperienceSessionService,
            {} as AiAgentUsageService,
            {} as KakaoTurnService
        );
        expect(await skill.resolveUser('123')).toMatchObject({ kind: 'LINKED', userId: 1 });
        expect(users.findByKakaoLoginId).toHaveBeenCalledTimes(1); // 연결 확정에서만 조회, 스킬은 연결 행 사용
    });

    it('AC-3-10: 탈퇴자 연결을 실제로 교체하고 재연결 시 선택 활동을 보존한다', async () => {
        await service.link(2, '123');
        users.findByIdOrThrow.mockResolvedValue(
            Object.assign(new User(), { id: 2, isActive: false })
        );
        await linkFacade.link(1, tokens.signLinkToken(1, '123'));
        expect(await service.findByUserId(2)).toBeNull();
        await service.selectBlock(1, '12');
        await linkFacade.link(1, tokens.signLinkToken(1, '123'));
        expect((await service.findByUserId(1))?.currentBlockId).toBe('12');
    });

    it('탈퇴 연결 삭제 후 새 연결 저장이 실패하면 이전 연결도 롤백한다', async () => {
        await service.link(2, '123');
        users.findByIdOrThrow.mockResolvedValue(
            Object.assign(new User(), { id: 2, isActive: false })
        );
        const spy = jest
            .spyOn(service, 'linkOrThrow')
            .mockRejectedValue(new BusinessException(ErrorCode.KAKAO_ACCOUNT_ALREADY_LINKED));
        try {
            await expect(linkFacade.link(1, tokens.signLinkToken(1, '123'))).rejects.toThrow();
            expect((await service.findByKakaoAppUserId('123'))?.userId).toBe(2);
            expect(await service.findByUserId(1)).toBeNull();
        } finally {
            spy.mockRestore();
        }
    });

    it.each(['same', 'different-users', 'different-kakao'])(
        '동시 연결 %s는 멱등 처리하거나 명세 오류로 충돌을 반환한다',
        async (kind) => {
            let release!: () => void;
            const ready = new Promise<void>((resolve) => {
                release = resolve;
            });
            let calls = 0;
            const original = service.linkOrThrow.bind(service) as (
                uid: number,
                kid: string
            ) => Promise<void>;
            const spy = jest.spyOn(service, 'linkOrThrow').mockImplementation(async (uid, kid) => {
                calls += 1;
                if (calls === 2) release();
                await ready;
                await original(uid, kid);
            });
            try {
                const secondUid = kind === 'different-users' ? 2 : 1;
                const secondKid = kind === 'different-kakao' ? '456' : '123';
                const results = await Promise.allSettled([
                    linkFacade.link(1, tokens.signLinkToken(1, '123')),
                    linkFacade.link(secondUid, tokens.signLinkToken(secondUid, secondKid)),
                ]);
                expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
                    kind === 'same' ? 2 : 1
                );
                if (kind !== 'same') {
                    const rejected = results.find(
                        (result) => result.status === 'rejected'
                    ) as PromiseRejectedResult;
                    expect(rejected.reason).toBeInstanceOf(BusinessException);
                    expect((rejected.reason as BusinessException).getResponse()).toMatchObject({
                        errorCode: kind === 'different-users' ? 'KAKAO409' : 'KAKAO4091',
                    });
                }
                expect(await db.getRepository(KakaoChannelLink).count()).toBe(1);
            } finally {
                spy.mockRestore();
            }
        }
    );
});
