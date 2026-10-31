import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ExperienceMapTicketFacade } from './experience-map-ticket.facade';
import { ExperienceMapTicketService } from '../services/experience-map-ticket.service';
import { BlockService } from '../services/block.service';
import { AiExperienceSessionService } from '../services/ai-experience-session.service';
import { AiAgentUsageService } from '../services/ai-agent-usage.service';

describe('ExperienceMapTicketFacade', () => {
    const jwtService = new JwtService({ secret: 'test-secret' });
    const ticketService = new ExperienceMapTicketService(jwtService, new ConfigService());
    const consume = jest.fn();
    const facade = new ExperienceMapTicketFacade(
        { findExperienceOrThrow: jest.fn() } as unknown as BlockService,
        {
            getOrCreate: jest.fn().mockResolvedValue({ sessionId: 'session-1' }),
        } as unknown as AiExperienceSessionService,
        ticketService,
        { consume } as unknown as AiAgentUsageService
    );

    it('턴 티켓은 scope=turn과 rid를 담는다', () => {
        const { ticket } = ticketService.issueTicket(1, 'session-1', '12', 'turn', 'req-1');

        expect(jwtService.verify(ticket)).toMatchObject({ scope: 'turn', rid: 'req-1' });
    });

    it('조회용 티켓은 한도를 차감하지 않고 scope=read를 담는다', async () => {
        const res = await facade.issueReadTicket(1, '12');
        const payload = jwtService.verify<Record<string, unknown>>(res.ticket);

        expect(consume).not.toHaveBeenCalled();
        expect(payload).not.toHaveProperty('rid');
        expect(payload).toMatchObject({
            sub: '1',
            sid: 'session-1',
            bid: '12',
            scope: 'read',
        });
    });
});
