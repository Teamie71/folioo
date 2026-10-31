import { Injectable } from '@nestjs/common';
import { FeedbackForm } from '../../domain/entities/feedback-form.entity';
import { FeedbackFormRepository } from '../../infrastructure/repositories/feedback-form.repository';
import { EventFeedbackFormResDTO } from '../dtos/event-feedback-form.res.dto';

@Injectable()
export class FeedbackFormService {
    constructor(private readonly feedbackFormRepository: FeedbackFormRepository) {}

    async getLatestByUpdatedAtRes(): Promise<EventFeedbackFormResDTO> {
        const form = await this.feedbackFormRepository.findLatestByUpdatedAt();
        if (!form) {
            return {
                formId: null,
                eventId: null,
                schema: [],
            };
        }
        return this.toResDto(form);
    }

    private toResDto(form: FeedbackForm): EventFeedbackFormResDTO {
        const schema = Array.isArray(form.schema) ? (form.schema as Record<string, unknown>[]) : [];

        return {
            formId: form.id,
            eventId: form.eventId,
            schema,
        };
    }
}
