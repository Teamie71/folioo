import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { BlockRepository } from '../../infrastructure/repositories/block.repository';
import { BlockKindRepository } from '../../infrastructure/repositories/block-kind.repository';
import { ExperienceMetaRepository } from '../../infrastructure/repositories/experience-meta.repository';
import {
    Block,
    BLOCK_CONTENT_MAX_LENGTH,
    BLOCK_MAX_LEVEL,
    BLOCK_NAME_MAX_LENGTH,
} from '../../domain/block.entity';
import { BlockKindEntity } from '../../domain/block-kind.entity';
import { ExperienceMeta } from '../../domain/experience-meta.entity';
import { DeletedBlocksSnapshot } from '../../domain/ai-commit-log.entity';
import { BlockKind, EXPERIENCE_SECTION_KINDS } from '../../domain/enums/block-kind.enum';
import { BLOCK_KIND_TO_SECTION_KIND, SectionKind } from '../../domain/enums/section-kind.enum';
import {
    getAnchorSlot,
    getCategorySlotsForSection,
    getDefaultSubTemplate,
} from '../../domain/templates/template-catalog';
import { isUniqueViolation } from '../utils/typeorm-error.util';

const NAME_LEVEL_KINDS: readonly BlockKind[] = [BlockKind.GROUP, BlockKind.EXPERIENCE];

@Injectable()
export class BlockService {
    constructor(
        private readonly blockRepository: BlockRepository,
        private readonly blockKindRepository: BlockKindRepository,
        private readonly experienceMetaRepository: ExperienceMetaRepository
    ) {}

    async getTreeByUserId(userId: number): Promise<Block[]> {
        return this.blockRepository.findAllByUserId(userId);
    }

    async findRecentExperiences(userId: number): Promise<{ id: string; name: string }[]> {
        const activities = await this.blockRepository.findRecentExperiences(userId, 10);
        return activities.map(({ id, name }) => ({
            id,
            name: name?.trim() ? name : '이름 없는 활동',
        }));
    }

    async findExperience(blockId: string, userId: number): Promise<Block | null> {
        const block = await this.blockRepository.findByIdAndUserId(blockId, userId);
        return block?.kind === BlockKind.EXPERIENCE ? block : null;
    }

    // 되돌리기: AI 커밋이 새로 만든 블록을 삭제한다. parent_id CASCADE 덕분에
    // 목록에 조상 id만 있어도 하위 트리가 함께 지워진다.
    async deleteByIds(blockIds: string[]): Promise<void> {
        await this.blockRepository.deleteByIds(blockIds);
    }

    // 되돌리기: AI 커밋이 수정한 블록의 content를 커밋 이전 값으로 복원한다.
    async restoreContent(
        userId: number,
        previousContentByBlockId: Record<string, string | null>
    ): Promise<void> {
        const blockIds = Object.keys(previousContentByBlockId);
        const blocks = await this.blockRepository.findByIdsAndUserId(blockIds, userId);
        for (const block of blocks) {
            block.content = previousContentByBlockId[block.id];
        }
        await this.blockRepository.saveAll(blocks);
    }

    // 되돌리기: AI 커밋이 삭제한 블록을 원래 id 그대로 다시 넣고, 영향받은 부모의 자식 순서를
    // 삭제 직전 순서로 맞춘다. 트리거가 부모 존재를 검사하므로 상위 레벨부터 넣는다.
    async restoreDeleted(userId: number, snapshot: DeletedBlocksSnapshot): Promise<void> {
        const blocks = [...snapshot.blocks]
            .sort((a, b) => a.level - b.level)
            .map((row) =>
                Object.assign(new Block(), { ...row, userId, createdAt: new Date(row.createdAt) })
            );
        // 한 INSERT 문 안에서도 앞선 행은 트리거에서 보이므로 레벨 순 정렬만으로 충분하다.
        await this.blockRepository.insertAll(blocks);

        const orderByParentId = snapshot.siblingOrderByParentId;
        const children = await this.blockRepository.findAllByParentIds(
            Object.keys(orderByParentId)
        );
        for (const child of children) {
            const order = orderByParentId[child.parentId as string];
            const index = order.indexOf(child.id);
            // 스냅샷 이후 생긴 자식은 없어야 하지만(버전 검사), 있으면 맨 뒤로 보낸다.
            child.position = index === -1 ? order.length + child.position : index;
        }
        await this.blockRepository.saveAll(children);
    }

    async getOrCreateRootBlock(userId: number): Promise<Block> {
        const existingRoot = await this.blockRepository.findRootByUserId(userId);
        if (existingRoot) {
            return existingRoot;
        }

        const root = new Block();
        root.userId = userId;
        root.parent = null;
        root.parentId = null;
        root.level = 1;
        root.kind = BlockKind.GROUP_UNCATEGORIZED;
        root.position = 0;
        root.content = null;
        root.placeholder = null;
        return this.blockRepository.save(root);
    }

    async findByIdOrThrow(blockId: string, userId: number): Promise<Block> {
        const block = await this.blockRepository.findByIdAndUserId(blockId, userId);
        if (!block) {
            throw new BusinessException(ErrorCode.BLOCK_NOT_FOUND);
        }
        return block;
    }

    // AI 에이전트는 활동(EXPERIENCE) 블록 단위로 존재하므로 다른 종류는 없는 활동으로 취급한다.
    async findExperienceOrThrow(blockId: string, userId: number): Promise<Block> {
        const block = await this.findByIdOrThrow(blockId, userId);
        if (block.kind !== BlockKind.EXPERIENCE) {
            throw new BusinessException(ErrorCode.BLOCK_NOT_FOUND);
        }
        return block;
    }

    private async findParentOrThrow(parentId: string, userId: number): Promise<Block> {
        const parent = await this.blockRepository.findByIdAndUserId(parentId, userId);
        if (!parent) {
            throw new BusinessException(ErrorCode.BLOCK_PARENT_NOT_FOUND);
        }
        return parent;
    }

    async createBlock(
        userId: number,
        kind: BlockKind,
        parentId: string | null,
        content: string | null
    ): Promise<Block> {
        const parent = parentId ? await this.findParentOrThrow(parentId, userId) : null;
        this.assertValidPlacement(kind, parent);
        const isSectionKind = EXPERIENCE_SECTION_KINDS.includes(kind);
        if (isSectionKind && parent) {
            await this.assertNoDuplicateSection(parent.id, kind);
        }
        const normalizedContent = isSectionKind ? null : content;
        this.assertContentLength(kind, normalizedContent);

        const block = new Block();
        block.userId = userId;
        block.parent = parent;
        block.parentId = parentId;
        block.level = parent ? parent.level + 1 : 1;
        block.kind = kind;
        block.position = await this.blockRepository.countChildren(userId, parentId);
        block.content = normalizedContent;
        block.placeholder = this.resolveDefaultPlaceholder(kind, parent);

        let savedBlock: Block;
        try {
            savedBlock = await this.blockRepository.save(block);
        } catch (error) {
            if (isSectionKind && isUniqueViolation(error)) {
                throw new BusinessException(ErrorCode.BLOCK_SECTION_ALREADY_EXISTS);
            }
            throw error;
        }

        if (kind === BlockKind.EXPERIENCE) {
            await this.provisionExperienceScaffold(savedBlock);
        }

        return savedBlock;
    }

    async updateContent(blockId: string, userId: number, content: string | null): Promise<Block> {
        const block = await this.findByIdOrThrow(blockId, userId);
        const blockKind = await this.getBlockKindOrThrow(block.kind);
        if (!blockKind.isTextEditable) {
            throw new BusinessException(ErrorCode.BLOCK_NOT_EDITABLE);
        }
        this.assertContentLength(block.kind, content);
        block.content = content;
        return this.blockRepository.save(block);
    }

    async deleteBlock(blockId: string, userId: number): Promise<void> {
        const block = await this.findByIdOrThrow(blockId, userId);
        const blockKind = await this.getBlockKindOrThrow(block.kind);
        if (!blockKind.isDeletable) {
            throw new BusinessException(ErrorCode.BLOCK_NOT_DELETABLE);
        }

        // 1단계 블록은 정책상 하위 블록을 함께 삭제하지 않고, 미분류로 옮긴 뒤 단독으로 삭제된다.
        if (block.level === 1) {
            await this.detachChildrenToRoot(block, userId);
        }

        await this.blockRepository.deleteById(blockId);
    }

    async moveBlock(
        blockId: string,
        userId: number,
        targetParentId: string | null | undefined,
        targetPosition: number
    ): Promise<Block> {
        const block = await this.findByIdOrThrow(blockId, userId);
        const allBlocks = await this.blockRepository.findAllByUserId(userId);
        const blockById = new Map(allBlocks.map((b) => [b.id, b]));

        const isReparenting = targetParentId !== undefined && targetParentId !== block.parentId;

        if (!isReparenting) {
            const siblings = allBlocks.filter(
                (b) => b.parentId === block.parentId && b.id !== block.id
            );
            this.insertAtPosition(siblings, block, targetPosition);
            await this.blockRepository.saveAll([block, ...siblings]);
            return block;
        }

        // 1단계(그룹)는 항상 루트라 순서만 바꿀 수 있다. 2단계(활동)는 다른 그룹으로 이동할 수 있다.
        if (block.level <= 1) {
            throw new BusinessException(ErrorCode.BLOCK_LEVEL_LOCKED);
        }

        const newParent = targetParentId ? (blockById.get(targetParentId) ?? null) : null;
        if (targetParentId && (!newParent || newParent.userId !== userId)) {
            throw new BusinessException(ErrorCode.BLOCK_PARENT_NOT_FOUND);
        }
        this.assertValidPlacement(block.kind, newParent);
        if (EXPERIENCE_SECTION_KINDS.includes(block.kind) && newParent) {
            await this.assertNoDuplicateSection(newParent.id, block.kind);
        }

        const newLevel = newParent ? newParent.level + 1 : 1;
        const levelDelta = newLevel - block.level;
        const descendants = this.collectDescendants(block.id, allBlocks);
        const deepestDescendantLevel = descendants.reduce(
            (max, descendant) => Math.max(max, descendant.level),
            block.level
        );
        if (deepestDescendantLevel + levelDelta > BLOCK_MAX_LEVEL) {
            throw new BusinessException(ErrorCode.BLOCK_INVALID_PLACEMENT);
        }

        const oldSiblings = allBlocks.filter(
            (b) => b.parentId === block.parentId && b.id !== block.id
        );
        const newSiblings = allBlocks.filter((b) => b.parentId === targetParentId);

        block.parent = newParent;
        block.parentId = targetParentId ?? null;
        block.level = newLevel;
        for (const descendant of descendants) {
            descendant.level += levelDelta;
        }

        this.reindexPositions(oldSiblings);
        this.insertAtPosition(newSiblings, block, targetPosition);

        try {
            await this.blockRepository.saveAll([
                block,
                ...descendants,
                ...oldSiblings,
                ...newSiblings,
            ]);
        } catch (error) {
            if (EXPERIENCE_SECTION_KINDS.includes(block.kind) && isUniqueViolation(error)) {
                throw new BusinessException(ErrorCode.BLOCK_SECTION_ALREADY_EXISTS);
            }
            throw error;
        }
        return block;
    }

    private async detachChildrenToRoot(groupBlock: Block, userId: number): Promise<void> {
        const children = await this.blockRepository.findAllByParentId(groupBlock.id);
        if (children.length === 0) {
            return;
        }

        const root = await this.getOrCreateRootBlock(userId);
        const rootChildrenCount = await this.blockRepository.countChildren(userId, root.id);
        children.forEach((child, index) => {
            child.parent = root;
            child.parentId = root.id;
            child.position = rootChildrenCount + index;
        });
        await this.blockRepository.saveAll(children);
    }

    private collectDescendants(blockId: string, allBlocks: Block[]): Block[] {
        const childrenByParentId = new Map<string, Block[]>();
        for (const block of allBlocks) {
            if (!block.parentId) continue;
            const siblings = childrenByParentId.get(block.parentId) ?? [];
            siblings.push(block);
            childrenByParentId.set(block.parentId, siblings);
        }

        const result: Block[] = [];
        const stack = [...(childrenByParentId.get(blockId) ?? [])];
        while (stack.length > 0) {
            const current = stack.pop();
            if (!current) continue;
            result.push(current);
            stack.push(...(childrenByParentId.get(current.id) ?? []));
        }
        return result;
    }

    // AI 커밋 API도 같은 형제 재배치 규칙을 써야 하므로(문서: "기존 에디터 드래그 정렬과
    // 동일한 로직을 쓸 것") 이 두 메서드는 public으로 둔다.
    insertAtPosition(siblings: Block[], moving: Block, targetPosition: number): void {
        const sorted = [...siblings].sort((a, b) => a.position - b.position);
        const clampedPosition = Math.max(0, Math.min(targetPosition, sorted.length));
        sorted.splice(clampedPosition, 0, moving);
        sorted.forEach((block, index) => {
            block.position = index;
        });
    }

    reindexPositions(siblings: Block[]): void {
        const sorted = [...siblings].sort((a, b) => a.position - b.position);
        sorted.forEach((block, index) => {
            block.position = index;
        });
    }

    private async provisionExperienceScaffold(experienceBlock: Block): Promise<void> {
        const sections = EXPERIENCE_SECTION_KINDS.map((sectionKind, index) => {
            const section = new Block();
            section.userId = experienceBlock.userId;
            section.parent = experienceBlock;
            section.parentId = experienceBlock.id;
            section.level = experienceBlock.level + 1;
            section.kind = sectionKind;
            section.position = index;
            section.content = null;
            section.placeholder = null;
            return section;
        });
        let savedSections: Block[];
        try {
            savedSections = await this.blockRepository.saveAll(sections);
        } catch (error) {
            if (isUniqueViolation(error)) {
                throw new BusinessException(ErrorCode.BLOCK_SECTION_ALREADY_EXISTS);
            }
            throw error;
        }

        const experienceMeta = new ExperienceMeta();
        experienceMeta.blockId = experienceBlock.id;
        experienceMeta.blockKind = BlockKind.EXPERIENCE;
        await this.experienceMetaRepository.save(experienceMeta);

        await this.provisionDefaultContentSlots(savedSections);
    }

    // 문서 "1. 기본 제공 데이터" — 섹션별 level4 카테고리 슬롯 10개 + TASK/PROBLEM_SOLVING
    // 앵커 하위 기본(BASIC) 템플릿 level5 슬롯 8개, 총 18개를 빈 content + 지정 placeholder로 생성한다.
    private async provisionDefaultContentSlots(sections: Block[]): Promise<void> {
        const level4Blocks: Block[] = [];
        const anchorBlockBySection = new Map<SectionKind, Block>();

        for (const section of sections) {
            const sectionKind = BLOCK_KIND_TO_SECTION_KIND.get(section.kind);
            if (!sectionKind) continue;

            getCategorySlotsForSection(sectionKind).forEach((slot, index) => {
                const block = new Block();
                block.userId = section.userId;
                block.parent = section;
                block.parentId = section.id;
                block.level = section.level + 1;
                block.kind = BlockKind.CONTENT;
                block.position = index;
                block.content = null;
                block.placeholder = slot.placeholder;
                level4Blocks.push(block);
                if (slot.isAnchor) {
                    anchorBlockBySection.set(sectionKind, block);
                }
            });
        }
        await this.blockRepository.saveAll(level4Blocks);

        const level5Blocks: Block[] = [];
        for (const [sectionKind, anchorBlock] of anchorBlockBySection) {
            const defaultTemplate = getDefaultSubTemplate(sectionKind);
            if (!defaultTemplate) continue;

            defaultTemplate.slots.forEach((slot, index) => {
                const block = new Block();
                block.userId = anchorBlock.userId;
                block.parent = anchorBlock;
                block.parentId = anchorBlock.id;
                block.level = anchorBlock.level + 1;
                block.kind = BlockKind.CONTENT;
                block.position = index;
                block.content = null;
                block.placeholder = slot.placeholder;
                level5Blocks.push(block);
            });
        }
        if (level5Blocks.length > 0) {
            await this.blockRepository.saveAll(level5Blocks);
        }
    }

    // 문서 "0. 기본 placeholder" — 담당업무/문제해결 섹션 아래 새로 생성되는 4단계 블록은
    // 앵커 슬롯의 placeholder를 그대로 쓰고, 그 외에는 block_kind의 기본 placeholder로 폴백한다.
    private resolveDefaultPlaceholder(kind: BlockKind, parent: Block | null): string | null {
        if (kind !== BlockKind.CONTENT || !parent) {
            return null;
        }
        const sectionKind = BLOCK_KIND_TO_SECTION_KIND.get(parent.kind);
        if (!sectionKind) {
            return null;
        }
        return getAnchorSlot(sectionKind)?.placeholder ?? null;
    }

    private assertValidPlacement(kind: BlockKind, parent: Block | null): void {
        if (kind === BlockKind.GROUP) {
            if (parent !== null) {
                throw new BusinessException(ErrorCode.BLOCK_INVALID_PLACEMENT);
            }
            return;
        }

        if (kind === BlockKind.EXPERIENCE) {
            const validParentKinds: BlockKind[] = [BlockKind.GROUP_UNCATEGORIZED, BlockKind.GROUP];
            if (!parent || !validParentKinds.includes(parent.kind)) {
                throw new BusinessException(ErrorCode.BLOCK_INVALID_PLACEMENT);
            }
            return;
        }

        if (kind === BlockKind.CONTENT) {
            const isSectionParent = parent && EXPERIENCE_SECTION_KINDS.includes(parent.kind);
            const isExperienceParent = parent && parent.kind === BlockKind.EXPERIENCE;
            const isNestableContentParent =
                parent && parent.kind === BlockKind.CONTENT && parent.level < BLOCK_MAX_LEVEL;
            if (!isSectionParent && !isExperienceParent && !isNestableContentParent) {
                throw new BusinessException(ErrorCode.BLOCK_INVALID_PLACEMENT);
            }
            return;
        }

        if (EXPERIENCE_SECTION_KINDS.includes(kind)) {
            if (!parent || parent.kind !== BlockKind.EXPERIENCE) {
                throw new BusinessException(ErrorCode.BLOCK_INVALID_PLACEMENT);
            }
            return;
        }

        throw new BusinessException(ErrorCode.BLOCK_INVALID_PLACEMENT);
    }

    // 기본 카테고리(SECTION_*)는 삭제 가능하지만, 삭제 후 같은 종류를 다시 만들 수 있어야
    // 한 활동에 같은 카테고리가 중복 생성되지 않도록 막는다.
    private async assertNoDuplicateSection(parentId: string, kind: BlockKind): Promise<void> {
        const exists = await this.blockRepository.existsByParentIdAndKind(parentId, kind);
        if (exists) {
            throw new BusinessException(ErrorCode.BLOCK_SECTION_ALREADY_EXISTS);
        }
    }

    private assertContentLength(kind: BlockKind, content: string | null): void {
        if (!content) return;
        const maxLength = NAME_LEVEL_KINDS.includes(kind)
            ? BLOCK_NAME_MAX_LENGTH
            : BLOCK_CONTENT_MAX_LENGTH;
        if (content.length > maxLength) {
            throw new BusinessException(ErrorCode.BLOCK_CONTENT_TOO_LONG, { maxLength });
        }
    }

    private async getBlockKindOrThrow(kind: BlockKind): Promise<BlockKindEntity> {
        const blockKind = await this.blockKindRepository.findByKind(kind);
        if (!blockKind) {
            throw new BusinessException(ErrorCode.BLOCK_INVALID_PLACEMENT);
        }
        return blockKind;
    }
}
