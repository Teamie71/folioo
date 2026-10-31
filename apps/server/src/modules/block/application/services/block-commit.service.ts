import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { Block, BLOCK_MAX_LEVEL } from '../../domain/block.entity';
import { BlockKind, EXPERIENCE_SECTION_KINDS } from '../../domain/enums/block-kind.enum';
import {
    BLOCK_KIND_TO_SECTION_KIND,
    SECTION_KIND_LABEL,
    SECTION_KIND_TO_BLOCK_KIND,
} from '../../domain/enums/section-kind.enum';
import { findSlotPlaceholder } from '../../domain/templates/template-catalog';
import { BlockService } from './block.service';
import { BlockKindRepository } from '../../infrastructure/repositories/block-kind.repository';
import { BlockRepository } from '../../infrastructure/repositories/block.repository';
import { isUniqueViolation } from '../utils/typeorm-error.util';
import {
    CommitAppliedItemResDTO,
    CommitItemAction,
    CommitItemReqDTO,
} from '../dtos/experience-map-commit.dto';
import { DeletedBlocksSnapshot } from '../../domain/ai-commit-log.entity';

export interface BlockCommitResult {
    applied: CommitAppliedItemResDTO[];
    createdBlockIds: string[];
    updatedBlocksPreviousContent: Record<string, string | null>;
    deletedBlocks: DeletedBlocksSnapshot | null;
}

const ADD_LEVEL_SECTION = 3;
const ADD_LEVEL_CONTENT_MIN = 4;
const ADD_LEVEL_CONTENT_MAX = 5;
const UPDATE_LEVEL_MIN = 4;
const UPDATE_LEVEL_MAX = 5;
const EXPERIENCE_LEVEL = 2;

@Injectable()
export class BlockCommitService {
    constructor(
        private readonly blockService: BlockService,
        private readonly blockRepository: BlockRepository,
        private readonly blockKindRepository: BlockKindRepository
    ) {}

    async execute(
        userId: number,
        items: CommitItemReqDTO[],
        allBlocks: Block[]
    ): Promise<BlockCommitResult> {
        this.assertTopologicalOrder(items);

        const blockById = new Map(allBlocks.map((block) => [block.id, block]));
        const blockByItemId = new Map<string, Block>();
        const dirtyBlocks = new Set<Block>();
        const applied: CommitAppliedItemResDTO[] = [];
        const createdBlockIds: string[] = [];
        const updatedBlocksPreviousContent: Record<string, string | null> = {};
        const deleted: DeletedBlocksSnapshot = { blocks: [], siblingOrderByParentId: {} };
        let sharedExperienceId: string | null = null;

        for (const item of items) {
            const block =
                item.action === CommitItemAction.ADD
                    ? await this.processAdd(userId, item, blockById, blockByItemId, dirtyBlocks)
                    : this.resolveTarget(item, blockById);

            const experienceId = this.resolveExperienceRootId(block, blockById);
            sharedExperienceId ??= experienceId;
            if (experienceId !== sharedExperienceId) {
                throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_HIERARCHY);
            }
            // 삭제하면 blockById에서 빠지므로 경로는 먼저 만든다.
            const path = this.buildPath(block, blockById);

            if (item.action === CommitItemAction.ADD) {
                createdBlockIds.push(block.id);
            } else if (item.action === CommitItemAction.UPDATE) {
                this.applyUpdate(item, block, updatedBlocksPreviousContent);
                dirtyBlocks.add(block);
            } else {
                this.applyDelete(block, blockById, createdBlockIds, deleted);
            }
            applied.push(CommitAppliedItemResDTO.of(item.item_id, item.action, block.id, path));
        }

        const deletedIds = new Set(deleted.blocks.map((block) => block.id));
        const blocksToSave = [...dirtyBlocks].filter((block) => !deletedIds.has(block.id));
        if (blocksToSave.length > 0) {
            await this.blockRepository.saveAll(blocksToSave);
        }
        // parent_id CASCADE로 하위 트리도 함께 지워진다.
        await this.blockRepository.deleteByIds([...deletedIds]);

        return {
            applied,
            createdBlockIds,
            updatedBlocksPreviousContent,
            deletedBlocks: deleted.blocks.length > 0 ? deleted : null,
        };
    }

    private assertTopologicalOrder(items: CommitItemReqDTO[]): void {
        const itemIds = new Set(items.map((item) => item.item_id));
        if (itemIds.size !== items.length) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_HIERARCHY);
        }

        const seen = new Set<string>();
        for (const item of items) {
            if (item.action === CommitItemAction.ADD && item.parent_item_id) {
                if (!seen.has(item.parent_item_id)) {
                    throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_HIERARCHY);
                }
            }
            seen.add(item.item_id);
        }
    }

    private async processAdd(
        userId: number,
        item: CommitItemReqDTO,
        blockById: Map<string, Block>,
        blockByItemId: Map<string, Block>,
        dirtyBlocks: Set<Block>
    ): Promise<Block> {
        const parent = this.resolveParent(item, blockById, blockByItemId);
        const { level, kind } = this.resolveAddLevelAndKind(parent, item, blockById);
        this.assertContentValid(item.content);
        const placeholder = this.resolvePlaceholder(item.slot_id);
        const isSectionKind = EXPERIENCE_SECTION_KINDS.includes(kind);

        const siblings = this.getSiblings(parent.id, blockById);
        const block = new Block();
        block.userId = userId;
        block.parent = parent;
        block.parentId = parent.id;
        block.level = level;
        block.kind = kind;
        block.content = isSectionKind ? null : (item.content ?? null);
        block.placeholder = placeholder;

        const targetPosition = this.resolveTargetPosition(siblings, item.after_id);
        this.blockService.insertAtPosition(siblings, block, targetPosition);
        for (const sibling of siblings) {
            dirtyBlocks.add(sibling);
        }

        // 위의 형제 목록 기반 중복 체크(resolveAddLevelAndKind)는 같은 요청 안의
        // in-memory 스냅샷만 보므로, 동시 요청 경쟁 조건은 DB의
        // idx_block_unique_section_per_parent 위반(23505)을 잡아 createBlock/moveBlock과
        // 동일하게 BLOCK_SECTION_ALREADY_EXISTS로 변환한다(원인이 같으면 에러코드도 같아야 한다).
        let savedBlock: Block;
        try {
            savedBlock = await this.blockRepository.save(block);
        } catch (error) {
            if (isSectionKind && isUniqueViolation(error)) {
                throw new BusinessException(ErrorCode.BLOCK_SECTION_ALREADY_EXISTS);
            }
            throw error;
        }
        blockById.set(savedBlock.id, savedBlock);
        blockByItemId.set(item.item_id, savedBlock);
        return savedBlock;
    }

    private resolveTarget(item: CommitItemReqDTO, blockById: Map<string, Block>): Block {
        if (!item.target_id) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_TARGET);
        }
        // blockById는 이미 userId로 스코프된 트리라 조회 성공 자체가 소유권 검증이다.
        const target = blockById.get(item.target_id);
        if (!target) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_TARGET);
        }
        return target;
    }

    private applyUpdate(
        item: CommitItemReqDTO,
        target: Block,
        updatedBlocksPreviousContent: Record<string, string | null>
    ): void {
        if (target.level < UPDATE_LEVEL_MIN || target.level > UPDATE_LEVEL_MAX) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_HIERARCHY);
        }
        this.assertContentValid(item.content);

        // 같은 요청에서 여러 번 수정돼도 되돌릴 값은 커밋 이전 값이어야 한다.
        if (!(target.id in updatedBlocksPreviousContent)) {
            updatedBlocksPreviousContent[target.id] = target.content;
        }
        target.content = item.content ?? null;
    }

    // CONTENT(4·5단계)만 삭제할 수 있다. 상위 블록 삭제는 experience_meta·세션 등이 함께
    // 사라져 되돌리기로 복원할 수 없기 때문이다. 같은 요청에서 추가한 블록이 하위에 있으면
    // 되돌리기 스냅샷과 어긋나므로 거부한다.
    private applyDelete(
        target: Block,
        blockById: Map<string, Block>,
        createdBlockIds: string[],
        deleted: DeletedBlocksSnapshot
    ): void {
        if (target.kind !== BlockKind.CONTENT || !target.parentId) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_TARGET);
        }
        const subtree = [target, ...this.collectDescendants(target.id, blockById)];
        if (subtree.some((block) => createdBlockIds.includes(block.id))) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_TARGET);
        }

        deleted.siblingOrderByParentId[target.parentId] ??= this.getSiblings(
            target.parentId,
            blockById
        )
            .sort((a, b) => a.position - b.position)
            .map((sibling) => sibling.id);

        for (const block of subtree) {
            deleted.blocks.push({
                id: block.id,
                parentId: block.parentId as string,
                level: block.level,
                kind: block.kind,
                position: block.position,
                content: block.content,
                placeholder: block.placeholder,
                createdAt: block.createdAt.toISOString(),
            });
            blockById.delete(block.id);
        }
    }

    private collectDescendants(blockId: string, blockById: Map<string, Block>): Block[] {
        const children = this.getSiblings(blockId, blockById);
        return children.flatMap((child) => [
            child,
            ...this.collectDescendants(child.id, blockById),
        ]);
    }

    private resolveParent(
        item: CommitItemReqDTO,
        blockById: Map<string, Block>,
        blockByItemId: Map<string, Block>
    ): Block {
        if (item.parent_item_id) {
            const parent = blockByItemId.get(item.parent_item_id);
            if (!parent) {
                throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_TARGET);
            }
            return parent;
        }
        if (item.parent_id) {
            const parent = blockById.get(item.parent_id);
            if (!parent) {
                throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_TARGET);
            }
            return parent;
        }
        throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_HIERARCHY);
    }

    private resolveAddLevelAndKind(
        parent: Block,
        item: CommitItemReqDTO,
        blockById: Map<string, Block>
    ): { level: number; kind: BlockKind } {
        const level = parent.level + 1;

        if (level === ADD_LEVEL_SECTION) {
            if (parent.kind !== BlockKind.EXPERIENCE || !item.section_kind) {
                throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_HIERARCHY);
            }
            const kind = SECTION_KIND_TO_BLOCK_KIND[item.section_kind];
            const siblings = this.getSiblings(parent.id, blockById);
            if (siblings.some((sibling) => sibling.kind === kind)) {
                throw new BusinessException(ErrorCode.BLOCK_SECTION_ALREADY_EXISTS);
            }
            return { level, kind };
        }

        if (level >= ADD_LEVEL_CONTENT_MIN && level <= ADD_LEVEL_CONTENT_MAX) {
            const isSectionParent = EXPERIENCE_SECTION_KINDS.includes(parent.kind);
            const isNestableContentParent =
                parent.kind === BlockKind.CONTENT && parent.level < BLOCK_MAX_LEVEL;
            if (!isSectionParent && !isNestableContentParent) {
                throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_HIERARCHY);
            }
            return { level, kind: BlockKind.CONTENT };
        }

        throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_HIERARCHY);
    }

    private resolveExperienceRootId(block: Block, blockById: Map<string, Block>): string {
        let current = block;
        while (current.level > EXPERIENCE_LEVEL) {
            const parent = current.parentId ? blockById.get(current.parentId) : undefined;
            if (!parent) {
                throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_TARGET);
            }
            current = parent;
        }
        if (current.level !== EXPERIENCE_LEVEL || current.kind !== BlockKind.EXPERIENCE) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_HIERARCHY);
        }
        return current.id;
    }

    private getSiblings(parentId: string, blockById: Map<string, Block>): Block[] {
        return Array.from(blockById.values()).filter((block) => block.parentId === parentId);
    }

    private resolveTargetPosition(siblings: Block[], afterId: string | null | undefined): number {
        if (afterId === undefined || afterId === null) {
            return siblings.length;
        }
        const sorted = [...siblings].sort((a, b) => a.position - b.position);
        const index = sorted.findIndex((sibling) => sibling.id === afterId);
        if (index === -1) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_INVALID_TARGET);
        }
        return index + 1;
    }

    private resolvePlaceholder(slotId: string | null | undefined): string | null {
        if (!slotId) {
            return null;
        }
        const placeholder = findSlotPlaceholder(slotId);
        if (placeholder === null) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_UNKNOWN_SLOT_ID);
        }
        return placeholder;
    }

    private assertContentValid(content: string | null | undefined): void {
        if (content == null) {
            return;
        }
        if (content.trim().length === 0 || content.length > 500) {
            throw new BusinessException(ErrorCode.BLOCK_CONTENT_TOO_LONG, { maxLength: 500 });
        }
    }

    private buildPath(block: Block, blockById: Map<string, Block>): string {
        const segments: string[] = [];
        let current = block.parentId ? blockById.get(block.parentId) : undefined;
        while (current && current.level >= EXPERIENCE_LEVEL) {
            segments.unshift(this.labelOf(current));
            current = current.parentId ? blockById.get(current.parentId) : undefined;
        }
        return segments.join(' > ');
    }

    private labelOf(block: Block): string {
        if (block.content) {
            return block.content;
        }
        const sectionKind = BLOCK_KIND_TO_SECTION_KIND.get(block.kind);
        if (sectionKind) {
            return SECTION_KIND_LABEL[sectionKind];
        }
        return block.placeholder ?? '';
    }
}
