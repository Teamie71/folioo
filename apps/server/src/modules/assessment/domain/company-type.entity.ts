import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ValueKind } from './enums/value-kind.enum';
import { ValueVector } from './types';

@Entity('company_types')
@Unique('company_types_code_version_uq', ['code', 'rulesetVersionId'])
export class CompanyType {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    code: string;

    @Column()
    name: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ type: 'real', name: 'score_work_life_balance' })
    scoreWorkLifeBalance: number;

    @Column({ type: 'real', name: 'score_compensation' })
    scoreCompensation: number;

    @Column({ type: 'real', name: 'score_stability' })
    scoreStability: number;

    @Column({ type: 'real', name: 'score_brand_value' })
    scoreBrandValue: number;

    @Column({ type: 'real', name: 'score_growth' })
    scoreGrowth: number;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'text', nullable: true })
    tip: string | null;

    @Column({ name: 'ruleset_version_id' })
    rulesetVersionId: number;

    toValueVector(): ValueVector {
        return {
            [ValueKind.WORK_LIFE_BALANCE]: this.scoreWorkLifeBalance,
            [ValueKind.REWARD]: this.scoreCompensation,
            [ValueKind.STABILITY]: this.scoreStability,
            [ValueKind.NAME_VALUE]: this.scoreBrandValue,
            [ValueKind.GROWTH]: this.scoreGrowth,
        };
    }
}
