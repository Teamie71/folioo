import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { ValueKind } from './enums/value-kind.enum';
import { ValueBalanceStatus } from './enums/value-balance-status.enum';

export interface ValueComparisonLogEntry {
    sequence: number;
    left: ValueKind;
    right: ValueKind;
    chosen: ValueKind;
}

// 테이블명은 job-search 모듈로 있을 때 만들어진 이름을 그대로 쓴다.
// 이미 머지된 스키마라 이름만 바꾸는 마이그레이션은 얻는 것 없이 리스크만 있어서 유지한다.
@Entity('job_search_sessions')
export class ValueBalanceSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int', name: 'user_id', nullable: true })
    userId: number | null;

    @Column({ type: 'varchar', length: 20, default: ValueBalanceStatus.VALUES_IN_PROGRESS })
    status: ValueBalanceStatus;

    @Column({ type: 'jsonb', name: 'values_insertion_order' })
    valuesInsertionOrder: ValueKind[];

    @Column({ type: 'jsonb', name: 'values_answer_log' })
    valuesAnswerLog: ValueComparisonLogEntry[];

    @Column({ type: 'jsonb', name: 'values_ranking', nullable: true })
    valuesRanking: ValueKind[] | null;

    @Column({ type: 'jsonb', name: 'values_weights', nullable: true })
    valuesWeights: Partial<Record<ValueKind, number>> | null;

    @Column({ type: 'timestamptz', name: 'values_completed_at', nullable: true })
    valuesCompletedAt: Date | null;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;

    static create(userId: number | null, insertionOrder: ValueKind[]): ValueBalanceSession {
        const session = new ValueBalanceSession();
        session.userId = userId;
        session.status = ValueBalanceStatus.VALUES_IN_PROGRESS;
        session.valuesInsertionOrder = insertionOrder;
        session.valuesAnswerLog = [];
        session.valuesRanking = null;
        session.valuesWeights = null;
        session.valuesCompletedAt = null;
        return session;
    }

    completeValues(ranking: ValueKind[], weights: Partial<Record<ValueKind, number>>): void {
        this.valuesRanking = ranking;
        this.valuesWeights = weights;
        this.valuesCompletedAt = new Date();
        this.status = ValueBalanceStatus.VALUES_DONE;
    }
}
