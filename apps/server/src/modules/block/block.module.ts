import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';
import { AiRelayModule } from 'src/infra/ai-relay/ai-relay.module';
import { Block } from './domain/block.entity';
import { BlockKindEntity } from './domain/block-kind.entity';
import { ExperienceMeta } from './domain/experience-meta.entity';
import { Review } from './domain/review.entity';
import { ExperienceMap } from './domain/experience-map.entity';
import { AiExperienceSession } from './domain/ai-experience-session.entity';
import { AiExperienceRequest } from './domain/ai-experience-request.entity';
import { AiCommitLog } from './domain/ai-commit-log.entity';
import { AiCommitRequest } from './domain/ai-commit-request.entity';
import { AiAgentUsage } from './domain/ai-agent-usage.entity';
import { BlockRepository } from './infrastructure/repositories/block.repository';
import { BlockKindRepository } from './infrastructure/repositories/block-kind.repository';
import { ExperienceMetaRepository } from './infrastructure/repositories/experience-meta.repository';
import { ExperienceMapRepository } from './infrastructure/repositories/experience-map.repository';
import { AiCommitRequestRepository } from './infrastructure/repositories/ai-commit-request.repository';
import { AiCommitLogRepository } from './infrastructure/repositories/ai-commit-log.repository';
import { AiAgentUsageRepository } from './infrastructure/repositories/ai-agent-usage.repository';
import { BlockService } from './application/services/block.service';
import { ExperienceMapService } from './application/services/experience-map.service';
import { ExperienceMetaService } from './application/services/experience-meta.service';
import { AiCommitLogService } from './application/services/ai-commit-log.service';
import { AiAgentUsageService } from './application/services/ai-agent-usage.service';
import { BlockCommitService } from './application/services/block-commit.service';
import { AiExperienceSessionService } from './application/services/ai-experience-session.service';
import { ExperienceMapTicketService } from './application/services/experience-map-ticket.service';
import { AiExperienceSessionRepository } from './infrastructure/repositories/ai-experience-session.repository';
import { ExperienceMapFacade } from './application/facades/experience-map.facade';
import { ExperienceMapTicketFacade } from './application/facades/experience-map-ticket.facade';
import { ExperienceMapController } from './presentation/experience-map.controller';
import { ExperienceMapAiController } from './presentation/experience-map-ai.controller';
import { ExperienceMapInternalController } from './presentation/experience-map-internal.controller';
import { TemplateCatalogService } from './application/services/template-catalog.service';
import { TemplateController } from './presentation/template.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Block,
            BlockKindEntity,
            ExperienceMeta,
            Review,
            ExperienceMap,
            AiExperienceSession,
            AiExperienceRequest,
            AiCommitLog,
            AiCommitRequest,
            AiAgentUsage,
        ]),
        AiRelayModule,
        // 티켓 서명 전용 시크릿(EXPMAP_TICKET_SECRET)을 쓰는 별도 JwtService.
        // auth.module.ts의 JwtModule(JWT_SECRET_TOKEN)과는 모듈 스코프가 분리되어 서로 섞이지 않는다.
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>('EXPMAP_TICKET_SECRET'),
                signOptions: {
                    expiresIn: (configService.get<string>('EXPMAP_TICKET_TTL_SECONDS') ||
                        '300') as StringValue,
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [
        ExperienceMapController,
        ExperienceMapAiController,
        ExperienceMapInternalController,
        TemplateController,
    ],
    providers: [
        BlockRepository,
        BlockKindRepository,
        ExperienceMetaRepository,
        ExperienceMapRepository,
        AiCommitRequestRepository,
        AiCommitLogRepository,
        AiAgentUsageRepository,
        AiExperienceSessionRepository,
        BlockService,
        ExperienceMapService,
        ExperienceMetaService,
        AiCommitLogService,
        AiAgentUsageService,
        BlockCommitService,
        AiExperienceSessionService,
        ExperienceMapTicketService,
        ExperienceMapFacade,
        ExperienceMapTicketFacade,
        TemplateCatalogService,
    ],
    exports: [BlockService, AiExperienceSessionService, AiAgentUsageService],
})
export class BlockModule {}
