import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsUUID } from 'class-validator';

export class IssueTicketReqDTO {
    @IsNumberString({ no_symbols: true })
    @ApiProperty({
        type: 'string',
        example: '12',
        description: '대화할 활동(EXPERIENCE) 블록 id. bigint라 문자열로 주고받는다.',
    })
    block_id: string;

    @IsOptional()
    @IsUUID()
    @ApiProperty({
        required: false,
        description:
            '재시도 시 실패한 요청의 request_id를 그대로 전달하면 새 UUID를 생성하지 않고 재사용합니다.',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    request_id?: string;
}

export class IssueTicketResDTO {
    @ApiProperty({
        description:
            'HS256으로 서명된 턴 실행용 티켓. sub/sid/bid/scope(turn)/rid(request_id)/iat/exp를 담는다.',
    })
    ticket: string;

    @ApiProperty({ description: '활동(block_id)별 AI 경험 정리 세션 id' })
    session_id: string;

    @ApiProperty({ description: '이번 턴의 request_id. 커밋 시 그대로 사용된다.' })
    request_id: string;

    @ApiProperty({ description: '티켓 만료까지 남은 초' })
    expires_in: number;

    static from(
        ticket: string,
        sessionId: string,
        requestId: string,
        expiresIn: number
    ): IssueTicketResDTO {
        const dto = new IssueTicketResDTO();
        dto.ticket = ticket;
        dto.session_id = sessionId;
        dto.request_id = requestId;
        dto.expires_in = expiresIn;
        return dto;
    }
}

export class IssueReadTicketReqDTO extends PickType(IssueTicketReqDTO, ['block_id']) {}

export class IssueReadTicketResDTO {
    @ApiProperty({
        description:
            'HS256으로 서명된 조회용 티켓. sub/sid/bid/scope(read)/iat/exp를 담는다. 턴 실행에는 쓸 수 없다.',
    })
    ticket: string;

    @ApiProperty({ description: '활동(block_id)별 AI 경험 정리 세션 id' })
    session_id: string;

    @ApiProperty({ description: '티켓 만료까지 남은 초' })
    expires_in: number;

    static from(ticket: string, sessionId: string, expiresIn: number): IssueReadTicketResDTO {
        const dto = new IssueReadTicketResDTO();
        dto.ticket = ticket;
        dto.session_id = sessionId;
        dto.expires_in = expiresIn;
        return dto;
    }
}
