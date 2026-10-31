import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import { AiExperienceSession } from './ai-experience-session.entity';
import { AiExperienceRequestStatus } from './enums/ai-experience-request-status.enum';

@Entity('ai_experience_request')
@Index(['userId', 'sessionId'])
@Index(['userId', 'requestHash'])
export class AiExperienceRequest {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @PrimaryColumn({ name: 'request_id', type: 'uuid' })
    requestId: string;

    @Column({ name: 'session_id', type: 'uuid' })
    sessionId: string;

    @ManyToOne(() => AiExperienceSession, { onDelete: 'CASCADE' })
    @JoinColumn([
        { name: 'user_id', referencedColumnName: 'userId' },
        { name: 'session_id', referencedColumnName: 'sessionId' },
    ])
    session: AiExperienceSession;

    @Column({ name: 'request_hash', type: 'char', length: 64 })
    requestHash: string;

    @Column({ type: 'varchar', length: 20, default: AiExperienceRequestStatus.RUNNING })
    status: AiExperienceRequestStatus;

    @Column({ name: 'failed_node', type: 'varchar', length: 100, nullable: true })
    failedNode: string | null;

    @Column({ type: 'boolean', default: false })
    retryable: boolean;

    @Column({ name: 'retry_expires_at', type: 'timestamptz', nullable: true })
    retryExpiresAt: Date | null;

    @Column({ name: 'lease_expires_at', type: 'timestamptz', nullable: true })
    leaseExpiresAt: Date | null;

    @Column({ name: 'base_map_version', type: 'bigint', nullable: true })
    baseMapVersion: string | null;

    @Column({ name: 'committed_version', type: 'bigint', nullable: true })
    committedVersion: string | null;

    @Column({ name: 'input_meta', type: 'jsonb', nullable: true })
    inputMeta: Record<string, unknown> | null;

    @Column({ type: 'jsonb', nullable: true })
    result: Record<string, unknown> | null;

    @Column({ type: 'jsonb', nullable: true })
    suggestion: Record<string, unknown> | null;

    @Column({ type: 'jsonb', nullable: true })
    error: Record<string, unknown> | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
