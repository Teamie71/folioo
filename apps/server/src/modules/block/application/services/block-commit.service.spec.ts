import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { BlockCommitService } from './block-commit.service';
import { BlockService } from './block.service';
import { BlockRepository } from '../../infrastructure/repositories/block.repository';
import { BlockKindRepository } from '../../infrastructure/repositories/block-kind.repository';
import { ExperienceMetaRepository } from '../../infrastructure/repositories/experience-meta.repository';
import { Block } from '../../domain/block.entity';
import { BlockKind } from '../../domain/enums/block-kind.enum';
import { CommitItemAction } from '../dtos/experience-map-commit.dto';

function makeBlock(overrides: Partial<Block>): Block {
    return Object.assign(new Block(), {
        userId: 1,
        parent: null,
        position: 0,
        content: null,
        placeholder: null,
        createdAt: new Date('2026-09-01T00:00:00Z'),
        updatedAt: new Date('2026-09-01T00:00:00Z'),
        ...overrides,
    });
}

// parent_id ON DELETE CASCADE를 흉내 내는 인메모리 블록 저장소
function createFakeRepository(initial: Block[]) {
    const rows = new Map(initial.map((block) => [block.id, { ...block }]));
    const cascadeDelete = (id: string): void => {
        rows.delete(id);
        for (const row of [...rows.values()]) {
            if (row.parentId === id) cascadeDelete(row.id);
        }
    };
    let nextId = 100;
    const repository = {
        save: (block: Block) => {
            block.id ??= String(nextId++);
            rows.set(block.id, { ...block });
            return Promise.resolve(block);
        },
        saveAll: (blocks: Block[]) => {
            blocks.forEach((block) => rows.set(block.id, { ...block }));
            return Promise.resolve(blocks);
        },
        insertAll: (blocks: Block[]) => {
            blocks.forEach((block) => {
                if (block.parentId && !rows.has(block.parentId)) {
                    throw new Error(`parent block ${block.parentId} not found`);
                }
                rows.set(block.id, { ...block });
            });
            return Promise.resolve();
        },
        deleteByIds: (ids: string[]) => {
            ids.forEach(cascadeDelete);
            return Promise.resolve();
        },
        findAllByParentIds: (parentIds: string[]) =>
            Promise.resolve(
                [...rows.values()]
                    .filter((row) => parentIds.includes(row.parentId as string))
                    .map((row) => Object.assign(new Block(), row))
            ),
    };
    const childrenOf = (parentId: string) =>
        [...rows.values()]
            .filter((row) => row.parentId === parentId)
            .sort((a, b) => a.position - b.position)
            .map((row) => `${row.id}:${row.content}`);
    const snapshot = () => [...rows.values()].map((row) => Object.assign(new Block(), row));
    return { repository, childrenOf, snapshot };
}

describe('BlockCommitService.execute + BlockService.restoreDeleted', () => {
    const experience = makeBlock({ id: '2', parentId: '1', level: 2, kind: BlockKind.EXPERIENCE });
    const section = makeBlock({ id: '3', parentId: '2', level: 3, kind: BlockKind.SECTION_TASK });
    const a = makeBlock({
        id: '10',
        parentId: '3',
        level: 4,
        kind: BlockKind.CONTENT,
        position: 0,
        content: 'A',
    });
    const b = makeBlock({
        id: '11',
        parentId: '3',
        level: 4,
        kind: BlockKind.CONTENT,
        position: 1,
        content: 'B',
    });
    const bChild = makeBlock({
        id: '20',
        parentId: '11',
        level: 5,
        kind: BlockKind.CONTENT,
        position: 0,
        content: 'B-1',
    });
    const c = makeBlock({
        id: '12',
        parentId: '3',
        level: 4,
        kind: BlockKind.CONTENT,
        position: 2,
        content: 'C',
    });
    const root = makeBlock({
        id: '1',
        parentId: null,
        level: 1,
        kind: BlockKind.GROUP_UNCATEGORIZED,
    });

    function setup() {
        const fake = createFakeRepository([root, experience, section, a, b, bChild, c]);
        const repository = fake.repository as unknown as BlockRepository;
        const blockService = new BlockService(
            repository,
            {} as BlockKindRepository,
            {} as ExperienceMetaRepository
        );
        const commitService = new BlockCommitService(
            blockService,
            repository,
            {} as BlockKindRepository
        );
        return { fake, blockService, commitService };
    }

    it('삭제한 CONTENT 하위 트리를 같은 id·내용·순서로 복원한다', async () => {
        const { fake, blockService, commitService } = setup();

        const result = await commitService.execute(
            1,
            [
                {
                    item_id: 'u1',
                    action: CommitItemAction.UPDATE,
                    target_id: '11',
                    content: 'B수정',
                },
                { item_id: 'd1', action: CommitItemAction.DELETE, target_id: '11' },
                // 삭제 뒤 추가는 형제 position을 다시 매겨(0,1,2) 원래 position과 겹치게 만든다
                { item_id: 'a1', action: CommitItemAction.ADD, parent_id: '3', content: 'D' },
            ],
            fake.snapshot()
        );

        expect(fake.childrenOf('3')).toEqual(['10:A', '12:C', '100:D']);
        expect(result.applied.map((item) => item.action)).toEqual(['update', 'delete', 'add']);
        expect(result.deletedBlocks?.blocks.map((row) => row.id)).toEqual(['11', '20']);

        // revert 순서: 생성분 삭제 → 삭제분 복원 → 내용 복원
        await blockService.deleteByIds(result.createdBlockIds);
        await blockService.restoreDeleted(1, result.deletedBlocks!);
        expect(fake.childrenOf('3')).toEqual(['10:A', '11:B수정', '12:C']);
        expect(fake.childrenOf('11')).toEqual(['20:B-1']);
        expect(result.updatedBlocksPreviousContent).toEqual({ '11': 'B' });
    });

    it('update만 있는 커밋도 수정된 블록을 저장한다', async () => {
        const { fake, commitService } = setup();

        await commitService.execute(
            1,
            [{ item_id: 'u1', action: CommitItemAction.UPDATE, target_id: '10', content: 'A수정' }],
            fake.snapshot()
        );

        expect(fake.childrenOf('3')).toEqual(['10:A수정', '11:B', '12:C']);
    });

    it('같은 블록을 두 번 수정해도 되돌리기 기준은 커밋 이전 값이다', async () => {
        const { fake, commitService } = setup();

        const result = await commitService.execute(
            1,
            [
                { item_id: 'u1', action: CommitItemAction.UPDATE, target_id: '10', content: 'A1' },
                { item_id: 'u2', action: CommitItemAction.UPDATE, target_id: '10', content: 'A2' },
            ],
            fake.snapshot()
        );

        expect(result.updatedBlocksPreviousContent).toEqual({ '10': 'A' });
        expect(fake.childrenOf('3')).toEqual(['10:A2', '11:B', '12:C']);
    });

    it('CONTENT가 아닌 블록 삭제는 거부한다', async () => {
        const { fake, commitService } = setup();

        await expect(
            commitService.execute(
                1,
                [{ item_id: 'd1', action: CommitItemAction.DELETE, target_id: '3' }],
                fake.snapshot()
            )
        ).rejects.toEqual(new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_TARGET));
    });
});
