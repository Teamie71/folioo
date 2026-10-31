import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventParticipation } from '../../domain/entities/event-participation.entity';

@Injectable()
export class EventParticipationRepository {
    constructor(
        @InjectRepository(EventParticipation)
        private readonly eventParticipationRepository: Repository<EventParticipation>
    ) {}

    async createIfMissing(userId: number, eventId: number): Promise<void> {
        await this.eventParticipationRepository
            .createQueryBuilder()
            .insert()
            .into(EventParticipation)
            .values(this.eventParticipationRepository.create({ userId, eventId }))
            .orIgnore()
            .execute();
    }

    async findByUserIdAndEventIdForUpdate(
        userId: number,
        eventId: number
    ): Promise<EventParticipation | null> {
        return this.eventParticipationRepository
            .createQueryBuilder('participation')
            .where('participation.userId = :userId', { userId })
            .andWhere('participation.eventId = :eventId', { eventId })
            .setLock('pessimistic_write')
            .getOne();
    }
}
