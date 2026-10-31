import { ApiProperty } from '@nestjs/swagger';

export class EventFeedbackFormResDTO {
    @ApiProperty({ example: 1, nullable: true, description: '등록된 폼이 없으면 null' })
    formId: number | null;

    @ApiProperty({ example: 1, nullable: true, description: '등록된 폼이 없으면 null' })
    eventId: number | null;

    @ApiProperty({
        type: 'array',
        items: {
            type: 'object',
            additionalProperties: true,
        },
        example: [
            {
                id: 'q1',
                type: 'RATING',
                text: '이번 챌린지 만족도는 어떠셨나요?',
                required: true,
                maxRating: 5,
            },
            {
                id: 'q2',
                type: 'TEXTAREA',
                text: '더 나은 이벤트를 위해 개선할 점을 자유롭게 적어주세요.',
                required: false,
            },
        ],
    })
    schema: Record<string, unknown>[];
}
