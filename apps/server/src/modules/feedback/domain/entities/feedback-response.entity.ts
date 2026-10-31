import { BaseEntity } from '../../../../common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { EventParticipation } from '../../../event/domain/entities/event-participation.entity';
import { FeedbackForm } from './feedback-form.entity';

@Entity('feedback_response')
@Index(['participationId'])
@Index(['formId'])
export class FeedbackResponse extends BaseEntity {
    static createForSubmit(params: {
        participationId: number;
        formId: number;
        answers: unknown;
    }): FeedbackResponse {
        const entity = new FeedbackResponse();
        entity.participationId = params.participationId;
        entity.formId = params.formId;
        entity.answers = params.answers;
        return entity;
    }

    @ManyToOne(() => EventParticipation, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'participation_id' })
    participation: EventParticipation;

    @Column({ name: 'participation_id' })
    participationId: number;

    @ManyToOne(() => FeedbackForm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'form_id' })
    form: FeedbackForm;

    @Column({ name: 'form_id' })
    formId: number;

    @Column({ type: 'jsonb' })
    answers: unknown;

    @Column({ name: 'submitted_at', type: 'timestamp', default: () => 'now()' })
    submittedAt: Date;
}
