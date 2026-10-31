import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { EventFeedbackFormResDTO } from '../application/dtos/event-feedback-form.res.dto';
import { FeedbackFormService } from '../application/services/feedback-form.service';

@ApiTags('Feedback')
@Controller('feedbacks')
export class FeedbackFormController {
    constructor(private readonly feedbackFormService: FeedbackFormService) {}

    @Get('feedback-form')
    @Public()
    @ApiOperation({
        summary: '피드백 질문지 조회',
        description:
            'updated_at 기준 가장 최근 피드백 질문지(schema)를 반환합니다. 등록된 폼이 없으면 formId·eventId는 null이고 schema는 빈 배열입니다.',
    })
    @ApiCommonResponse(EventFeedbackFormResDTO)
    async getLatestFeedbackForm(): Promise<EventFeedbackFormResDTO> {
        return this.feedbackFormService.getLatestByUpdatedAtRes();
    }
}
