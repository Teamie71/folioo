jest.mock('typeorm-transactional', () => ({ Transactional: () => () => undefined }));
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { AiAgentUsageService, AI_AGENT_DAILY_LIMIT } from './ai-agent-usage.service';
import { AiAgentUsageRepository } from '../../infrastructure/repositories/ai-agent-usage.repository';
import { AiAgentUsage } from '../../domain/ai-agent-usage.entity';

function makeInMemoryRepository(): AiAgentUsageRepository {
    const rows = new Map<string, AiAgentUsage>();
    const key = (userId: number, requestId: string) => `${userId}:${requestId}`;
    return {
        lockUser: () => Promise.resolve(),
        setQueryTimeout: () => Promise.resolve(),
        findByUserIdAndRequestId: (userId: number, requestId: string) =>
            Promise.resolve(rows.get(key(userId, requestId)) ?? null),
        countUsed: (userId: number, usageDate: string) =>
            Promise.resolve(
                [...rows.values()].filter(
                    (row) => row.userId === userId && row.usageDate === usageDate && !row.failed
                ).length
            ),
        save: (entity: AiAgentUsage) => {
            rows.set(key(entity.userId, entity.requestId), entity);
            return Promise.resolve(entity);
        },
        markFailed: (userId: number, requestId: string) => {
            const row = rows.get(key(userId, requestId));
            if (row) row.failed = true;
            return Promise.resolve();
        },
    } as unknown as AiAgentUsageRepository;
}

describe('AiAgentUsageService', () => {
    const userId = 1;
    // 2026-09-18 23:30 KST
    const lateNight = new Date('2026-09-18T14:30:00.000Z');
    let service: AiAgentUsageService;

    const useUp = async (count: number, now: Date) => {
        for (let i = 0; i < count; i++) {
            await service.consume(userId, `r${i}`, now);
        }
    };

    beforeEach(() => {
        service = new AiAgentUsageService(makeInMemoryRepository());
    });

    it('40번째까지 허용하고 41번째는 거부한다', async () => {
        await useUp(40, lateNight);
        expect(await service.getSummary(userId, lateNight)).toMatchObject({ used: 40, limit: 40 });
        await expect(service.consume(userId, 'over', lateNight)).rejects.toEqual(
            new BusinessException(ErrorCode.EXPERIENCE_MAP_DAILY_LIMIT_EXCEEDED)
        );
    });

    it('실패 처리된 턴은 세지 않고, 같은 request_id 재시도 시 다시 차감한다', async () => {
        await useUp(AI_AGENT_DAILY_LIMIT, lateNight);
        await service.markFailed(userId, 'r0');
        expect((await service.getSummary(userId, lateNight)).used).toBe(39);

        await service.consume(userId, 'r0', lateNight);
        expect((await service.getSummary(userId, lateNight)).used).toBe(40);
    });

    it('이미 차감된 request_id 재시도는 다시 차감하지 않는다', async () => {
        await useUp(AI_AGENT_DAILY_LIMIT, lateNight);
        await expect(service.consume(userId, 'r3', lateNight)).resolves.toBeUndefined();
        expect((await service.getSummary(userId, lateNight)).used).toBe(40);
    });

    it('KST 자정이 지나면 초기화된다', async () => {
        await useUp(AI_AGENT_DAILY_LIMIT, lateNight);
        // 2026-09-19 00:10 KST
        const afterMidnight = new Date('2026-09-18T15:10:00.000Z');

        const summary = await service.getSummary(userId, afterMidnight);
        expect(summary.used).toBe(0);
        expect(summary.resetAt.toISOString()).toBe('2026-09-19T15:00:00.000Z');
        await expect(service.consume(userId, 'next', afterMidnight)).resolves.toBeUndefined();
    });
});
