import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Block } from '../../domain/block.entity';
import { BlockKind } from '../../domain/enums/block-kind.enum';

export interface RecentExperience {
    id: string;
    name: string | null;
}

@Injectable()
export class BlockRepository {
    constructor(
        @InjectRepository(Block)
        private readonly blockRepository: Repository<Block>
    ) {}

    save(block: Block): Promise<Block> {
        return this.blockRepository.save(block);
    }

    saveAll(blocks: Block[]): Promise<Block[]> {
        return this.blockRepository.save(blocks);
    }

    // 되돌리기 복원용. save()와 달리 존재 여부 조회 없이 지정한 id 그대로 INSERT한다.
    async insertAll(blocks: Block[]): Promise<void> {
        if (blocks.length === 0) {
            return;
        }
        await this.blockRepository.insert(blocks);
    }

    async findAllByParentIds(parentIds: string[]): Promise<Block[]> {
        if (parentIds.length === 0) {
            return [];
        }
        return this.blockRepository.find({ where: { parentId: In(parentIds) } });
    }

    async findByIdAndUserId(id: string, userId: number): Promise<Block | null> {
        return this.blockRepository.findOne({ where: { id, userId } });
    }

    // 하위 블록을 포함한 마지막 수정 시각으로 정렬한다. 삭제된 하위 블록은 반영하지 않는다.
    findRecentExperiences(userId: number, limit: number): Promise<RecentExperience[]> {
        return this.blockRepository.query<RecentExperience[]>(
            `WITH RECURSIVE tree AS (
                SELECT id AS root_id, id, updated_at
                FROM block
                WHERE user_id = $1 AND kind = $2
                UNION ALL
                SELECT t.root_id, b.id, b.updated_at
                FROM block b
                JOIN tree t ON b.parent_id = t.id
                WHERE b.user_id = $1
            )
            SELECT e.id, e.content AS name
            FROM tree t
            JOIN block e ON e.id = t.root_id
            GROUP BY e.id, e.content
            ORDER BY MAX(t.updated_at) DESC, e.id DESC
            LIMIT $3`,
            [userId, BlockKind.EXPERIENCE, limit]
        );
    }

    async findRootByUserId(userId: number): Promise<Block | null> {
        return this.blockRepository.findOne({
            where: { userId, kind: BlockKind.GROUP_UNCATEGORIZED, parentId: IsNull() },
        });
    }

    async findAllByUserId(userId: number): Promise<Block[]> {
        return this.blockRepository.find({
            where: { userId },
            order: { level: 'ASC', position: 'ASC' },
        });
    }

    async findAllByParentId(parentId: string): Promise<Block[]> {
        return this.blockRepository.find({
            where: { parentId },
            order: { position: 'ASC' },
        });
    }

    async countChildren(userId: number, parentId: string | null): Promise<number> {
        return this.blockRepository.count({ where: { userId, parentId: parentId ?? IsNull() } });
    }

    async existsByParentIdAndKind(parentId: string, kind: BlockKind): Promise<boolean> {
        return this.blockRepository.exists({ where: { parentId, kind } });
    }

    async deleteById(id: string): Promise<void> {
        await this.blockRepository.delete(id);
    }

    async findByIdsAndUserId(ids: string[], userId: number): Promise<Block[]> {
        if (ids.length === 0) {
            return [];
        }
        return this.blockRepository.find({ where: { id: In(ids), userId } });
    }

    // parent_id에 ON DELETE CASCADE가 걸려 있어 조상 id 하나만 지워도 하위 트리가 함께 삭제된다.
    // 목록에 자식 id가 섞여 있어도 이미 지워진 행은 그냥 매칭되지 않을 뿐이라 순서를 신경 쓸 필요 없다.
    async deleteByIds(ids: string[]): Promise<void> {
        if (ids.length === 0) {
            return;
        }
        await this.blockRepository.delete(ids);
    }
}
