import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackResponse } from '../../domain/entities/feedback-response.entity';

@Injectable()
export class FeedbackResponseRepository {
    constructor(
        @InjectRepository(FeedbackResponse)
        private readonly feedbackResponseRepository: Repository<FeedbackResponse>
    ) {}

    async save(entity: FeedbackResponse): Promise<FeedbackResponse> {
        return this.feedbackResponseRepository.save(entity);
    }
}
