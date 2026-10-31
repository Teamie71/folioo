import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { EventParticipationService } from 'src/modules/event/application/services/event-participation.service';
import { EventService } from 'src/modules/event/application/services/event.service';
import { FeedbackResponse } from '../../domain/entities/feedback-response.entity';
import { SubmitFeedbackResponseReqDTO } from '../dtos/submit-feedback-response.req.dto';
import { SubmitFeedbackResponseResDTO } from '../dtos/submit-feedback-response.res.dto';
import { FeedbackFormRepository } from '../../infrastructure/repositories/feedback-form.repository';
import { FeedbackResponseRepository } from '../../infrastructure/repositories/feedback-response.repository';

@Injectable()
export class SubmitFeedbackFacade {
    constructor(
        private readonly eventService: EventService,
        private readonly eventParticipationService: EventParticipationService,
        private readonly feedbackFormRepository: FeedbackFormRepository,
        private readonly feedbackResponseRepository: FeedbackResponseRepository
    ) {}

    @Transactional()
    async submit(
        userId: number,
        dto: SubmitFeedbackResponseReqDTO
    ): Promise<SubmitFeedbackResponseResDTO> {
        await this.eventService.findByIdAndAssertActiveForTodayOrThrow(dto.eventId);
        const form = await this.feedbackFormRepository.findById(dto.formId);
        if (!form || form.eventId !== dto.eventId) {
            throw new BusinessException(ErrorCode.FEEDBACK_FORM_EVENT_MISMATCH);
        }

        const participation = await this.eventParticipationService.getOrCreateForUpdate(
            userId,
            dto.eventId
        );
        const response = FeedbackResponse.createForSubmit({
            participationId: participation.id,
            formId: form.id,
            answers: dto.answers,
        });
        await this.feedbackResponseRepository.save(response);
        return SubmitFeedbackResponseResDTO.of(false);
    }
}
