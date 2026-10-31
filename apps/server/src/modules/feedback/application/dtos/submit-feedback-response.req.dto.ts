import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsObject, Min } from 'class-validator';

export class SubmitFeedbackResponseReqDTO {
    @ApiProperty({ example: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    formId: number;

    @ApiProperty({ example: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    eventId: number;

    @ApiProperty({
        example: { q1: 5, q2: '스탬프 UI가 너무 귀여워서 모으는 맛이 있었어요!' },
        type: 'object',
        additionalProperties: true,
    })
    @IsObject()
    answers: Record<string, unknown>;
}
