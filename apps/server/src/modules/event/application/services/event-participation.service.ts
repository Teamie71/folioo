import { Injectable } from '@nestjs/common';
import { EventParticipationRepository } from '../../infrastructure/repositories/event-participation.repository';
import { EventParticipation } from '../../domain/entities/event-participation.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class EventParticipationService {
    constructor(private readonly eventParticipationRepository: EventParticipationRepository) {}

    async getOrCreateForUpdate(userId: number, eventId: number): Promise<EventParticipation> {
        // Concurrent first submissions must not abort the surrounding feedback transaction.
        await this.eventParticipationRepository.createIfMissing(userId, eventId);
        const participation =
            await this.eventParticipationRepository.findByUserIdAndEventIdForUpdate(
                userId,
                eventId
            );
        if (!participation) {
            throw new BusinessException(ErrorCode.EVENT_PARTICIPATION_NOT_FOUND);
        }
        return participation;
    }
}
