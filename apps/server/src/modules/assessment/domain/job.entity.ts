import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { TraitKind } from './enums/trait-kind.enum';
import { TraitVector } from './types';

// 배점 컬럼을 jsonb 하나로 묶지 않고 6개 컬럼으로 편다. SQL에서 직접 조회·수정 가능해야
// 운영 중 튜닝이 편하고, real 타입이라 값 검증도 DB가 해준다.
@Entity('jobs')
@Unique('jobs_code_version_uq', ['code', 'rulesetVersionId'])
@Index('jobs_version_active_idx', ['rulesetVersionId', 'isActive'])
export class Job {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    code: string;

    @Column()
    name: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ type: 'real', name: 'score_investigative' })
    scoreInvestigative: number;

    @Column({ type: 'real', name: 'score_social' })
    scoreSocial: number;

    @Column({ type: 'real', name: 'score_enterprising' })
    scoreEnterprising: number;

    @Column({ type: 'real', name: 'score_conventional' })
    scoreConventional: number;

    @Column({ type: 'real', name: 'score_realistic' })
    scoreRealistic: number;

    @Column({ type: 'real', name: 'score_artistic' })
    scoreArtistic: number;

    @Column({ type: 'text' })
    summary: string;

    @Column({ type: 'jsonb', name: 'core_skills' })
    coreSkills: string[];

    @Column({ type: 'jsonb', name: 'recommended_activities' })
    recommendedActivities: string[];

    @Column({ name: 'ruleset_version_id' })
    rulesetVersionId: number;

    toTraitVector(): TraitVector {
        return {
            [TraitKind.INVESTIGATIVE]: this.scoreInvestigative,
            [TraitKind.SOCIAL]: this.scoreSocial,
            [TraitKind.ENTERPRISING]: this.scoreEnterprising,
            [TraitKind.CONVENTIONAL]: this.scoreConventional,
            [TraitKind.REALISTIC]: this.scoreRealistic,
            [TraitKind.ARTISTIC]: this.scoreArtistic,
        };
    }
}
