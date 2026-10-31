import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';
import { AiAgentUsageSummary } from '../services/ai-agent-usage.service';

export class UsageResDTO {
    @ApiProperty({ example: 7, description: '오늘(KST) 사용한 횟수. 실패한 턴은 제외된다.' })
    used: number;

    @ApiProperty({ example: 10, description: '모든 에이전트 합산 일일 한도' })
    limit: number;

    @ApiProperty({
        example: '2026-09-18T15:00:00.000Z',
        description: '사용 횟수가 초기화되는 시각 (다음 KST 자정)',
    })
    reset_at: string;

    static from(summary: AiAgentUsageSummary): UsageResDTO {
        const dto = new UsageResDTO();
        dto.used = summary.used;
        dto.limit = summary.limit;
        dto.reset_at = summary.resetAt.toISOString();
        return dto;
    }
}

export class MarkRequestFailedReqDTO {
    @IsString()
    @ApiProperty({ example: '123' })
    user_id: string;

    @IsUUID()
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    request_id: string;
}
