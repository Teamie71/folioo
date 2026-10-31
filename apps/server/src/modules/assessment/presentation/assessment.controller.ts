import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { OptionalAuthGuard } from '../infrastructure/guards/optional-auth.guard';
import { AssessmentService } from '../application/services/assessment.service';
import { ValueBalanceSessionService } from '../application/services/value-balance-session.service';
import {
    AssessmentResultResDTO,
    AssessmentStatusResDTO,
    CreateAssessmentReqDTO,
} from '../application/dtos/assessment.dto';
import {
    ValueBalanceAnswerReqDTO,
    ValueBalanceQuestionResDTO,
} from '../application/dtos/value-balance.dto';

@ApiTags('Assessment')
@Controller('assessments')
export class AssessmentController {
    constructor(
        private readonly assessmentService: AssessmentService,
        private readonly valueBalanceSessionService: ValueBalanceSessionService
    ) {}

    @Post('values-balance/next-question')
    @Public()
    @ApiOperation({
        summary: '가치관 밸런스게임 다음 질문 조회',
        description:
            'token을 생략하면 새 세션을 시작해 첫 질문을 반환합니다. ' +
            'token과 함께 sequence·chosen을 보내면 그 답을 기록하고 다음 질문을 반환합니다. ' +
            '이미 답한 sequence를 다시 보내면(이전 질문으로 돌아가 다시 고르기) 그 지점 이후 기록은 폐기되고 이어서 다시 진행됩니다. ' +
            '5개 가치의 순위가 모두 확정되면 completed=true와 함께 순위·가중치를 반환하며, 이후에는 응답을 수정할 수 없습니다. ' +
            '이 순위를 그대로 POST /assessments의 valueRanking에 담아 보내면 됩니다.',
    })
    @ApiCommonResponse(ValueBalanceQuestionResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.ASSESSMENT_VALUE_BALANCE_NOT_FOUND,
        ErrorCode.ASSESSMENT_VALUE_BALANCE_ALREADY_COMPLETED,
        ErrorCode.ASSESSMENT_VALUE_BALANCE_INVALID_SEQUENCE,
        ErrorCode.ASSESSMENT_VALUE_BALANCE_INVALID_ANSWER
    )
    async getNextValueBalanceQuestion(
        @Body() body: ValueBalanceAnswerReqDTO
    ): Promise<ValueBalanceQuestionResDTO> {
        if (!body.token) {
            const progress = await this.valueBalanceSessionService.startValueBalance(null);
            return ValueBalanceQuestionResDTO.from(progress);
        }

        // ValueBalanceAnswerReqDTO의 @ValidateIf가 token 존재 시 sequence/chosen을 필수로 강제한다.
        const progress = await this.valueBalanceSessionService.answerValueBalance(
            body.token,
            body.sequence!,
            body.chosen!
        );
        return ValueBalanceQuestionResDTO.from(progress);
    }

    @Post()
    @Public()
    @UseGuards(OptionalAuthGuard)
    @ApiOperation({
        summary: '직무·기업형태 추천 분석 생성',
        description:
            '성향 문항 15개 응답과 확정된 가치관 순위(5개)로 분석을 실행하고 결과를 바로 반환합니다. ' +
            '로그인 상태로 요청하면 결과가 즉시 내 계정에 연결되고, 비로그인 상태면 이후 claim API로 등록할 수 있습니다.',
    })
    @ApiCommonResponse(AssessmentResultResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.ASSESSMENT_INVALID_INPUT,
        ErrorCode.ASSESSMENT_RULESET_NOT_READY
    )
    async create(
        @User('sub') userId: number | undefined,
        @Body() body: CreateAssessmentReqDTO
    ): Promise<AssessmentResultResDTO> {
        const result = await this.assessmentService.createAssessment({
            userId: userId ?? null,
            traitAnswers: body.traitAnswers,
            valueRanking: body.valueRanking,
            majorField: body.majorField ?? null,
        });
        return AssessmentResultResDTO.from(result);
    }

    @Get('status')
    @ApiOperation({
        summary: '직무·기업형태 추천 분석 실행 여부 조회',
        description:
            '로그인한 사용자 계정 기준으로 완료된 분석 결과가 있는지 확인합니다. ' +
            '생성 시점에 로그인 상태였거나, 이후 claim으로 등록한 결과 모두 대상입니다.',
    })
    @ApiCommonResponse(AssessmentStatusResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getStatus(@User('sub') userId: number): Promise<AssessmentStatusResDTO> {
        const result = await this.assessmentService.getStatusForUser(userId);
        return AssessmentStatusResDTO.from(result);
    }

    @Get(':uuid')
    @Public()
    @ApiOperation({
        summary: '직무·기업형태 추천 분석 결과 조회',
        description:
            'uuid만 있으면 로그인 여부와 무관하게 누구나 전체 내용을 조회할 수 있어 공유 링크로 사용됩니다.',
    })
    @ApiCommonResponse(AssessmentResultResDTO)
    @ApiCommonErrorResponse(ErrorCode.ASSESSMENT_NOT_FOUND)
    async getResult(@Param('uuid') uuid: string): Promise<AssessmentResultResDTO> {
        const result = await this.assessmentService.getResultOrThrow(uuid);
        return AssessmentResultResDTO.from(result);
    }

    @Post(':uuid/claim')
    @ApiOperation({
        summary: '직무·기업형태 추천 분석 결과 소유권 등록',
        description:
            '익명으로 생성한 분석 결과를 로그인한 내 계정에 연결합니다. 이미 다른 곳에 등록된 결과는 다시 등록할 수 없습니다.',
    })
    @ApiCommonResponse(AssessmentResultResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.ASSESSMENT_NOT_FOUND,
        ErrorCode.ASSESSMENT_ALREADY_CLAIMED,
        ErrorCode.UNAUTHORIZED
    )
    async claim(
        @Param('uuid') uuid: string,
        @User('sub') userId: number
    ): Promise<AssessmentResultResDTO> {
        const result = await this.assessmentService.claim(uuid, userId);
        return AssessmentResultResDTO.from(result);
    }
}
