import { Injectable } from '@nestjs/common';
import { EventRepository } from '../../infrastructure/repositories/event.repository';
import { Event } from '../../domain/entities/event.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { getSeoulDateString } from '../../../../common/utils/seoul-date.util';

@Injectable()
export class EventService {
    constructor(private readonly eventRepository: EventRepository) {}

    async findByIdOrThrow(id: number): Promise<Event> {
        const event = await this.eventRepository.findById(id);
        if (!event) {
            throw new BusinessException(ErrorCode.EVENT_NOT_FOUND);
        }
        return event;
    }

    /**
     * 이벤트 ID로 조회 후, 현재 시점(서울 일자)에 참여/제출을 받는 활성 이벤트인지 검증합니다.
     */
    async findByIdAndAssertActiveForTodayOrThrow(id: number): Promise<Event> {
        const event = await this.findByIdOrThrow(id);
        const today = getSeoulDateString();
        if (!event.isActive) {
            throw new BusinessException(ErrorCode.EVENT_NOT_ACTIVE);
        }
        const startStr = getSeoulDateString(new Date(event.startDate));
        if (startStr > today) {
            throw new BusinessException(ErrorCode.EVENT_NOT_ACTIVE);
        }
        if (event.endDate != null) {
            const endStr = getSeoulDateString(new Date(event.endDate));
            if (endStr < today) {
                throw new BusinessException(ErrorCode.EVENT_NOT_ACTIVE);
            }
        }
        return event;
    }
}
