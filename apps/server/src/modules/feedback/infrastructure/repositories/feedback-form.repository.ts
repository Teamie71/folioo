import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getSeoulDateString } from 'src/common/utils/seoul-date.util';
import { Event } from '../../../event/domain/entities/event.entity';
import { FeedbackForm } from '../../domain/entities/feedback-form.entity';

@Injectable()
export class FeedbackFormRepository {
    constructor(
        @InjectRepository(FeedbackForm)
        private readonly feedbackFormRepository: Repository<FeedbackForm>
    ) {}

    async findById(id: number): Promise<FeedbackForm | null> {
        return this.feedbackFormRepository.findOne({ where: { id } });
    }

    async findLatestByUpdatedAt(): Promise<FeedbackForm | null> {
        const today = getSeoulDateString();
        return this.feedbackFormRepository
            .createQueryBuilder('form')
            .innerJoin(Event, 'event', 'event.id = form.eventId')
            .where('event.isActive = :isActive', { isActive: true })
            .andWhere('event.startDate <= :today', { today })
            .andWhere('(event.endDate IS NULL OR event.endDate >= :today)', { today })
            .orderBy('form.updatedAt', 'DESC')
            .addOrderBy('form.id', 'DESC')
            .getOne();
    }
}
