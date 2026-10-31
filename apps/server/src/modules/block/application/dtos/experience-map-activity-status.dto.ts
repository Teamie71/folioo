import { ApiProperty } from '@nestjs/swagger';
import type { ActivityStatus, ActivityStatusItem } from '../services/ai-experience-session.service';

export class ActivityStatusResDTO {
    @ApiProperty({ example: '12', description: '활동(EXPERIENCE) 블록 id' })
    block_id: string;

    @ApiProperty({ description: '이 활동의 가장 최근 요청(턴) id' })
    request_id: string;

    @ApiProperty({
        enum: ['running', 'completed', 'failed', 'cancelled'],
        description:
            '가장 최근 요청의 상태. running=처리 중, completed=완료, failed=실패(처리 중 서버가 죽은 경우 포함), cancelled=사용자가 중지',
    })
    status: ActivityStatus;

    @ApiProperty({
        description:
            '사용자가 이 요청 결과를 확인했는지. 초록 점은 completed && !seen일 때 표시한다.',
    })
    seen: boolean;

    static from(item: ActivityStatusItem): ActivityStatusResDTO {
        const dto = new ActivityStatusResDTO();
        dto.block_id = item.blockId;
        dto.request_id = item.requestId;
        dto.status = item.status;
        dto.seen = item.seen;
        return dto;
    }
}
