import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './domain/entities/event.entity';
import { EventParticipation } from './domain/entities/event-participation.entity';
import { EventRepository } from './infrastructure/repositories/event.repository';
import { EventParticipationRepository } from './infrastructure/repositories/event-participation.repository';
import { EventService } from './application/services/event.service';
import { EventParticipationService } from './application/services/event-participation.service';

@Module({
    imports: [TypeOrmModule.forFeature([Event, EventParticipation])],
    providers: [
        EventRepository,
        EventParticipationRepository,
        EventService,
        EventParticipationService,
    ],
    exports: [EventService, EventParticipationService],
})
export class EventModule {}
