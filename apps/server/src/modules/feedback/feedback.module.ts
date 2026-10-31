import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackForm } from './domain/entities/feedback-form.entity';
import { FeedbackResponse } from './domain/entities/feedback-response.entity';
import { FeedbackFormService } from './application/services/feedback-form.service';
import { SubmitFeedbackFacade } from './application/facades/submit-feedback.facade';
import { FeedbackFormRepository } from './infrastructure/repositories/feedback-form.repository';
import { FeedbackResponseRepository } from './infrastructure/repositories/feedback-response.repository';
import { FeedbackFormController } from './presentation/feedback-form.controller';
import { FeedbackResponseController } from './presentation/feedback-response.controller';
import { EventModule } from '../event/event.module';

@Module({
    imports: [TypeOrmModule.forFeature([FeedbackForm, FeedbackResponse]), EventModule],
    controllers: [FeedbackFormController, FeedbackResponseController],
    providers: [
        FeedbackFormRepository,
        FeedbackResponseRepository,
        FeedbackFormService,
        SubmitFeedbackFacade,
    ],
    exports: [FeedbackFormRepository, FeedbackFormService],
})
export class FeedbackModule {}
