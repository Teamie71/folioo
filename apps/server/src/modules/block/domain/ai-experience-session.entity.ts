import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/domain/user.entity';

// 활동(EXPERIENCE 블록)마다 AI 에이전트 세션이 하나씩 존재한다.
@Entity('ai_experience_session')
export class AiExperienceSession {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @PrimaryColumn({ name: 'block_id', type: 'bigint' })
    blockId: string;

    @Column({ name: 'session_id', type: 'uuid', unique: true })
    sessionId: string;

    @Column({ name: 'active_gap', type: 'jsonb', nullable: true })
    activeGap: Record<string, unknown> | null;

    // 사용자가 확인한 마지막 request_id. 활동 상태의 "완료 후 미확인" 판정에 쓴다. 백엔드만 쓴다.
    @Column({ name: 'last_seen_request_id', type: 'uuid', nullable: true })
    lastSeenRequestId: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
