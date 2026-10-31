import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

const DEFAULT_TICKET_TTL_SECONDS = 300;

// turn: 대화 턴 실행용(한도 차감됨), read: 대화 내역 조회용(한도 차감 없음, 턴 실행 불가)
export type ExperienceMapTicketScope = 'turn' | 'read';

interface ExperienceMapTicketPayload {
    sub: string;
    sid: string;
    bid: string;
    scope: ExperienceMapTicketScope;
    rid?: string;
}

export interface IssuedTicket {
    ticket: string;
    expiresIn: number;
}

@Injectable()
export class ExperienceMapTicketService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    issueTicket(
        userId: number,
        sessionId: string,
        blockId: string,
        scope: ExperienceMapTicketScope,
        requestId?: string
    ): IssuedTicket {
        const expiresIn = Number(
            this.configService.get<string>('EXPMAP_TICKET_TTL_SECONDS') ??
                DEFAULT_TICKET_TTL_SECONDS
        );
        const payload: ExperienceMapTicketPayload = {
            sub: String(userId),
            sid: sessionId,
            bid: blockId,
            scope,
            // 턴 티켓은 request_id에 묶어 티켓 1장으로 턴 1회만 실행되게 한다
            ...(requestId && { rid: requestId }),
        };
        const ticket = this.jwtService.sign(payload, { expiresIn });
        return { ticket, expiresIn };
    }
}
