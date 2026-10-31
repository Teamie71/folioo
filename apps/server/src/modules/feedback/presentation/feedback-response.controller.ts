import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { SubmitFeedbackResponseReqDTO } from '../application/dtos/submit-feedback-response.req.dto';
import { SubmitFeedbackResponseResDTO } from '../application/dtos/submit-feedback-response.res.dto';
import { SubmitFeedbackFacade } from '../application/facades/submit-feedback.facade';

@ApiTags('Feedback')
@Controller('feedbacks')
export class FeedbackResponseController {
    constructor(private readonly submitFeedbackFacade: SubmitFeedbackFacade) {}

    @Post('feedback-responses')
    @ApiOperation({
        summary: '피드백 제출',
        description:
            '활성 이벤트와 연결된 폼을 검증한 뒤 피드백을 저장합니다. 보상 지급은 종료되어 rewardGranted는 항상 false입니다.',
    })
    @ApiCommonResponse(SubmitFeedbackResponseResDTO, {
        exampleResult: {
            rewardGranted: false,
        },
    })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EVENT_NOT_FOUND,
        ErrorCode.EVENT_NOT_ACTIVE,
        ErrorCode.FEEDBACK_FORM_EVENT_MISMATCH
    )
    async submitFeedbackResponse(
        @User('sub') userId: number,
        @Body() body: SubmitFeedbackResponseReqDTO
    ): Promise<SubmitFeedbackResponseResDTO> {
        return this.submitFeedbackFacade.submit(userId, body);
    }
}
