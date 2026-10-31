import { BaseEntity } from '../../../../common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Event } from '../../../event/domain/entities/event.entity';

@Entity('feedback_form')
@Index(['eventId'])
export class FeedbackForm extends BaseEntity {
    @ManyToOne(() => Event, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'event_id' })
    event: Event;

    @Column({ name: 'event_id' })
    eventId: number;

    @Column({ type: 'jsonb' })
    schema: unknown;
}
