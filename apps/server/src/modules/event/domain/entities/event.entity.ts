import { BaseEntity } from '../../../../common/entities/base.entity';
import { Column, Entity } from 'typeorm';

export interface RewardConfigItem {
    type: string;
    quantity: number;
}

export interface EventUiConfig {
    feedbackModal?: {
        eligibleTitle?: string;
        eligibleDescription?: string;
        rewardedTitle?: string;
        rewardedDescription?: string;
        ctaText?: string;
        ctaLink?: string;
    };
}

export interface EventOpsConfig {
    manualRewardOnly?: boolean;
    allowFeedbackAfterReward?: boolean;
    allowMultipleRewards?: boolean;
}

@Entity('event')
export class Event extends BaseEntity {
    @Column({ unique: true, length: 50 })
    code: string;

    @Column({ length: 100 })
    title: string;

    @Column({ length: 50 })
    ctaText: string;

    @Column({ length: 255, nullable: true })
    ctaLink: string;

    @Column({ type: 'jsonb' })
    rewardConfig: RewardConfigItem[];

    @Column({ type: 'jsonb', nullable: true })
    uiConfig: EventUiConfig | null;

    @Column({ type: 'jsonb', nullable: true })
    opsConfig: EventOpsConfig | null;

    @Column({ type: 'date' })
    startDate: Date;

    @Column({ type: 'date', nullable: true })
    endDate: Date;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 0 })
    displayOrder: number;
}
