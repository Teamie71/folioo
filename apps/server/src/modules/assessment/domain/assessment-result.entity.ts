import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ValueKind } from './enums/value-kind.enum';
import type {
    InputSnapshot,
    ScoredCompanyType,
    ScoredJob,
    TraitVector,
    ValueVector,
} from './types';

// rulesetVersion은 FK가 아니라 문자열 스냅샷이다. 룰셋 행이 삭제되어도 보고서는
// 어느 버전으로 계산됐는지 계속 알고 있어야 한다.
// inputSnapshot/topJobs/companyType은 값 복사 + 비정규화 저장이다. 원본이 나중에
// 수정되어도 과거 보고서는 계산 당시 내용을 그대로 보여줘야 하고, 조회 시 조인도 불필요해진다.
@Entity('assessment_results')
@Index('assessment_results_user_idx', ['userId'])
@Index('assessment_results_created_idx', ['createdAt'])
export class AssessmentResult {
    @PrimaryGeneratedColumn('uuid')
    uuid: string;

    @Column({ type: 'int', name: 'user_id', nullable: true })
    userId: number | null;

    @Column({ type: 'timestamptz', name: 'claimed_at', nullable: true })
    claimedAt: Date | null;

    @Column({ name: 'ruleset_version' })
    rulesetVersion: string;

    @Column({ type: 'jsonb', name: 'input_snapshot' })
    inputSnapshot: InputSnapshot;

    @Column({ type: 'jsonb', name: 'trait_vector' })
    traitVector: TraitVector;

    @Column({ type: 'jsonb', name: 'value_ranking' })
    valueRanking: ValueKind[];

    @Column({ type: 'jsonb', name: 'value_weights' })
    valueWeights: ValueVector;

    @Column({ type: 'text' })
    headline: string;

    @Column({ type: 'jsonb', name: 'top_jobs' })
    topJobs: ScoredJob[];

    @Column({ type: 'jsonb', name: 'company_type' })
    companyType: ScoredCompanyType;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    static create(input: {
        userId: number | null;
        rulesetVersion: string;
        inputSnapshot: InputSnapshot;
        traitVector: TraitVector;
        valueRanking: ValueKind[];
        valueWeights: ValueVector;
        headline: string;
        topJobs: ScoredJob[];
        companyType: ScoredCompanyType;
    }): AssessmentResult {
        const result = new AssessmentResult();
        result.userId = input.userId;
        result.claimedAt = null;
        result.rulesetVersion = input.rulesetVersion;
        result.inputSnapshot = input.inputSnapshot;
        result.traitVector = input.traitVector;
        result.valueRanking = input.valueRanking;
        result.valueWeights = input.valueWeights;
        result.headline = input.headline;
        result.topJobs = input.topJobs;
        result.companyType = input.companyType;
        return result;
    }

    claim(userId: number): void {
        this.userId = userId;
        this.claimedAt = new Date();
    }
}
