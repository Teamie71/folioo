import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ruleset_versions')
export class RulesetVersion {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    version: string;

    @Column({ type: 'text', nullable: true })
    note: string | null;

    @Column({ type: 'timestamptz', name: 'activated_at', nullable: true })
    activatedAt: Date | null;

    @Column({ type: 'real', name: 'trait_match_coefficient' })
    traitMatchCoefficient: number;

    @Column({ type: 'real', name: 'major_bonus_score' })
    majorBonusScore: number;

    // 순위 1위~5위 가중치(합계 1). ROC(Rank Order Centroid) 가중치.
    @Column({ type: 'jsonb', name: 'roc_weights' })
    rocWeights: number[];

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;
}
