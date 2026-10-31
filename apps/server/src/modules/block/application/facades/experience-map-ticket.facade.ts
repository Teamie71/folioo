import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Transactional } from 'typeorm-transactional';
import { BlockService } from '../services/block.service';
import { AiExperienceSessionService } from '../services/ai-experience-session.service';
import { ExperienceMapTicketService } from '../services/experience-map-ticket.service';
import { AiAgentUsageService } from '../services/ai-agent-usage.service';
import { IssueReadTicketResDTO, IssueTicketResDTO } from '../dtos/experience-map-ticket.dto';

@Injectable()
export class ExperienceMapTicketFacade {
    constructor(
        private readonly blockService: BlockService,
        private readonly aiExperienceSessionService: AiExperienceSessionService,
        private readonly experienceMapTicketService: ExperienceMapTicketService,
        private readonly aiAgentUsageService: AiAgentUsageService
    ) {}

    async issueTicket(
        userId: number,
        blockId: string,
        retryRequestId?: string
    ): Promise<IssueTicketResDTO> {
        await this.blockService.findExperienceOrThrow(blockId, userId);
        const session = await this.aiExperienceSessionService.getOrCreate(userId, blockId);
        const requestId = retryRequestId ?? randomUUID();
        return this.issueReservedTicket(userId, blockId, session.sessionId, requestId);
    }

    @Transactional()
    private async issueReservedTicket(
        userId: number,
        blockId: string,
        sessionId: string,
        requestId: string
    ): Promise<IssueTicketResDTO> {
        await this.aiAgentUsageService.consume(userId, requestId);
        const { ticket, expiresIn } = this.experienceMapTicketService.issueTicket(
            userId,
            sessionId,
            blockId,
            'turn',
            requestId
        );
        return IssueTicketResDTO.from(ticket, sessionId, requestId, expiresIn);
    }

    // 대화 내역 조회용. 한도를 차감하지 않으며, AI 서버는 이 티켓으로 턴을 실행하면 안 된다.
    async issueReadTicket(userId: number, blockId: string): Promise<IssueReadTicketResDTO> {
        await this.blockService.findExperienceOrThrow(blockId, userId);
        const session = await this.aiExperienceSessionService.getOrCreate(userId, blockId);
        const { ticket, expiresIn } = this.experienceMapTicketService.issueTicket(
            userId,
            session.sessionId,
            blockId,
            'read'
        );
        return IssueReadTicketResDTO.from(ticket, session.sessionId, expiresIn);
    }
}
