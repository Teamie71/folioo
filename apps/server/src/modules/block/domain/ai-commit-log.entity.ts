import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../user/domain/user.entity';
import { BlockKind } from './enums/block-kind.enum';

export interface DeletedBlockSnapshot {
    id: string;
    parentId: string;
    level: number;
    kind: BlockKind;
    position: number;
    content: string | null;
    placeholder: string | null;
    createdAt: string;
}

// AI 커밋이 삭제한 블록(하위 트리 포함)과, 삭제 직전 부모별 자식 순서.
// 되돌리기 시 같은 id로 다시 넣고 형제 순서를 이 목록대로 맞춘다.
export interface DeletedBlocksSnapshot {
    blocks: DeletedBlockSnapshot[];
    siblingOrderByParentId: Record<string, string[]>;
}

@Entity('ai_commit_log')
export class AiCommitLog {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'request_id', type: 'uuid' })
    requestId: string;

    @Column({ name: 'previous_version', type: 'bigint' })
    previousVersion: string;

    @Column({ name: 'committed_version', type: 'bigint' })
    committedVersion: string;

    @Column({ name: 'created_block_ids', type: 'bigint', array: true })
    createdBlockIds: string[];

    @Column({ name: 'updated_blocks', type: 'jsonb', nullable: true })
    updatedBlocks: Record<string, unknown> | null;

    @Column({ name: 'deleted_blocks', type: 'jsonb', nullable: true })
    deletedBlocks: DeletedBlocksSnapshot | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
}
