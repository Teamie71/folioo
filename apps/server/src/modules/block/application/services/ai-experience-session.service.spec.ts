import { AiRelayPort } from 'src/common/ports/ai-relay.port';
import { AiExperienceSessionService } from './ai-experience-session.service';
import {
    AiExperienceSessionRepository,
    LatestAiRequestRow,
} from '../../infrastructure/repositories/ai-experience-session.repository';
import { AiExperienceRequestStatus } from '../../domain/enums/ai-experience-request-status.enum';

describe('AiExperienceSessionService 활동 상태', () => {
    const userId = 1;
    const now = new Date('2026-09-28T12:00:00.000Z');
    const past = new Date('2026-09-28T11:59:00.000Z');
    const future = new Date('2026-09-28T12:01:00.000Z');

    let rows: LatestAiRequestRow[];
    let service: AiExperienceSessionService;

    const row = (overrides: Partial<LatestAiRequestRow>): LatestAiRequestRow => ({
        blockId: '10',
        lastSeenRequestId: null,
        requestId: 'r1',
        status: AiExperienceRequestStatus.COMPLETED,
        leaseExpiresAt: null,
        errorCode: null,
        ...overrides,
    });

    beforeEach(() => {
        rows = [];
        const repository = {
            findLatestRequests: (_userId: number, blockId?: string) =>
                Promise.resolve(rows.filter((r) => !blockId || r.blockId === blockId)),
            updateLastSeenRequestId: (_userId: number, blockId: string, requestId: string) => {
                rows.filter((r) => r.blockId === blockId).forEach((r) => {
                    r.lastSeenRequestId = requestId;
                });
                return Promise.resolve();
            },
        } as unknown as AiExperienceSessionRepository;
        service = new AiExperienceSessionService(repository, {} as AiRelayPort);
    });

    it('lease가 만료된 running은 failed, 살아있는 running은 running으로 본다', async () => {
        rows = [
            row({ blockId: '1', status: AiExperienceRequestStatus.RUNNING, leaseExpiresAt: past }),
            row({
                blockId: '2',
                status: AiExperienceRequestStatus.RUNNING,
                leaseExpiresAt: future,
            }),
        ];
        const statuses = await service.getActivityStatuses(userId, now);
        expect(statuses.map((s) => s.status)).toEqual(['failed', 'running']);
    });

    it("failed + error.code='cancelled'는 cancelled로 본다", async () => {
        rows = [
            row({ blockId: '1', status: AiExperienceRequestStatus.FAILED, errorCode: 'cancelled' }),
            row({ blockId: '2', status: AiExperienceRequestStatus.FAILED, errorCode: 'timeout' }),
        ];
        const statuses = await service.getActivityStatuses(userId, now);
        expect(statuses.map((s) => s.status)).toEqual(['cancelled', 'failed']);
    });

    it('완료된 요청을 확인 처리하면 seen이 된다', async () => {
        rows = [row({ blockId: '1' })];
        expect((await service.getActivityStatuses(userId, now))[0].seen).toBe(false);

        await service.markSeen(userId, '1', now);
        expect((await service.getActivityStatuses(userId, now))[0].seen).toBe(true);
    });

    it('처리 중인 요청은 확인 처리하지 않는다', async () => {
        rows = [
            row({
                blockId: '1',
                status: AiExperienceRequestStatus.RUNNING,
                leaseExpiresAt: future,
            }),
        ];
        await service.markSeen(userId, '1', now);
        expect(rows[0].lastSeenRequestId).toBeNull();
    });

    it('요청이 없는 활동의 확인 처리는 무시한다', async () => {
        await expect(service.markSeen(userId, '999', now)).resolves.toBeUndefined();
    });
});
