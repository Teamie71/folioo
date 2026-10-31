import { BaseEntity } from '../../../../common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { User } from '../../../user/domain/user.entity';
import { Event } from './event.entity';
import { EventRewardStatus } from '../enums/event-reward-status.enum';

@Entity('event_participation')
@Unique(['userId', 'eventId'])
@Index(['userId'])
@Index(['eventId'])
export class EventParticipation extends BaseEntity {
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => Event, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'event_id' })
    event: Event;

    @Column({ name: 'event_id' })
    eventId: number;

    @Column({ nullable: true })
    rewardGrantedAt: Date;

    @Column({
        type: 'enum',
        enum: EventRewardStatus,
        default: EventRewardStatus.NOT_GRANTED,
    })
    rewardStatus: EventRewardStatus;
}
