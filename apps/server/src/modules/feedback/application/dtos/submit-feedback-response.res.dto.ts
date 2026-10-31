import { ApiProperty } from '@nestjs/swagger';

export class SubmitFeedbackResponseResDTO {
    @ApiProperty({ example: false, description: '보상 지급 종료로 항상 false' })
    rewardGranted: boolean;

    static of(rewardGranted: boolean): SubmitFeedbackResponseResDTO {
        const dto = new SubmitFeedbackResponseResDTO();
        dto.rewardGranted = rewardGranted;
        return dto;
    }
}
