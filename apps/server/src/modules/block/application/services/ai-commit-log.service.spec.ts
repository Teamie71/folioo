import { AiCommitLogService } from './ai-commit-log.service';
import { AiCommitLogRepository } from '../../infrastructure/repositories/ai-commit-log.repository';
import { AiCommitLog } from '../../domain/ai-commit-log.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

function makeLog(overrides: Partial<AiCommitLog>): AiCommitLog {
    return Object.assign(new AiCommitLog(), {
        userId: 1,
        requestId: 'req-old',
        previousVersion: '1',
        committedVersion: '2',
        createdBlockIds: [],
        updatedBlocks: null,
        deletedBlocks: null,
        createdAt: new Date(),
        ...overrides,
    });
}

describe('AiCommitLogService', () => {
    let repository: jest.Mocked<
        Pick<AiCommitLogRepository, 'findByUserId' | 'save' | 'deleteByUserId'>
    >;
    let service: AiCommitLogService;

    beforeEach(() => {
        repository = {
            findByUserId: jest.fn(),
            save: jest.fn((log: AiCommitLog) => Promise.resolve(log)),
            deleteByUserId: jest.fn<Promise<void>, [number]>().mockResolvedValue(undefined),
        };
        service = new AiCommitLogService(repository as unknown as AiCommitLogRepository);
    });

    it('recordCommit은 기존 기록을 덮어쓰지 않고 새 행으로 교체해 created_at을 갱신한다', async () => {
        const stale = makeLog({ createdAt: new Date(Date.now() - 2 * DAY_MS) });
        repository.findByUserId.mockResolvedValue(stale);

        await service.recordCommit(1, {
            requestId: 'req-new',
            previousVersion: '2',
            committedVersion: '3',
            createdBlockIds: [],
            updatedBlocks: {},
            deletedBlocks: null,
        });

        expect(repository.deleteByUserId).toHaveBeenCalledWith(1);
        const saved = repository.save.mock.calls[0][0];
        expect(saved).not.toBe(stale);
        expect(saved.createdAt).toBeUndefined();
    });

    it('findRevertibleRequestId는 만료되었거나 이후 맵 변경이 있으면 null을 반환한다', async () => {
        repository.findByUserId.mockResolvedValue(makeLog({ committedVersion: '2' }));
        await expect(service.findRevertibleRequestId(1, '2')).resolves.toBe('req-old');
        await expect(service.findRevertibleRequestId(1, '3')).resolves.toBeNull();

        repository.findByUserId.mockResolvedValue(
            makeLog({ createdAt: new Date(Date.now() - DAY_MS - 1000) })
        );
        await expect(service.findRevertibleRequestId(1, '2')).resolves.toBeNull();
    });
});
