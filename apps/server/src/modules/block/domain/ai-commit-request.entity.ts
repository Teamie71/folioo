import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('ai_commit_request')
@Index(['createdAt'])
@Index(['requestId'])
export class AiCommitRequest {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @PrimaryColumn({ name: 'request_id', type: 'uuid' })
    requestId: string;

    @Column({ name: 'items_hash', type: 'char', length: 64 })
    itemsHash: string;

    @Column({ type: 'jsonb' })
    result: Record<string, unknown>;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
}
