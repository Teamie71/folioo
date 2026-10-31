import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonMessageResponse,
    ApiCommonResponse,
    ApiCommonResponseArray,
} from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { User } from 'src/common/decorators/user.decorator';
import { ExperienceMapTicketFacade } from '../application/facades/experience-map-ticket.facade';
import { ExperienceMapFacade } from '../application/facades/experience-map.facade';
import {
    IssueReadTicketReqDTO,
    IssueReadTicketResDTO,
    IssueTicketReqDTO,
    IssueTicketResDTO,
} from '../application/dtos/experience-map-ticket.dto';
import { RevertReqDTO, RevertResDTO } from '../application/dtos/experience-map-revert.dto';
import { UsageResDTO } from '../application/dtos/experience-map-usage.dto';
import { AiAgentUsageService } from '../application/services/ai-agent-usage.service';
import { AiExperienceSessionService } from '../application/services/ai-experience-session.service';
import { ActivityStatusResDTO } from '../application/dtos/experience-map-activity-status.dto';

@ApiTags('ExperienceMap - AI Integration')
@Controller('api/v1/experience-map')
export class ExperienceMapAiController {
    constructor(
        private readonly experienceMapTicketFacade: ExperienceMapTicketFacade,
        private readonly experienceMapFacade: ExperienceMapFacade,
        private readonly aiAgentUsageService: AiAgentUsageService,
        private readonly aiExperienceSessionService: AiExperienceSessionService
    ) {}

    @Post('ticket')
    @ApiOperation({
        summary: 'AI 경험 정리 세션 티켓 발급',
        description:
            '프론트가 AI 서버에 SSE로 직결하기 전에 신원을 발급받습니다. ' +
            'AI 에이전트 세션은 활동(EXPERIENCE 블록)마다 하나이며, ' +
            '해당 활동의 세션이 없으면 AI 서버 POST /sessions를 호출해 생성합니다. ' +
            'request_id를 body로 전달하면 새로 만들지 않고 그대로 재사용합니다(재시도 턴 유지). ' +
            '새 request_id면 일일 사용 한도(모든 에이전트 합산 40회)에서 1회 차감하고, 한도를 넘으면 429. ' +
            '이미 차감된 request_id의 재시도는 다시 차감하지 않으며, 실패 처리된 request_id를 재시도하면 다시 차감한다.',
    })
    @ApiCommonResponse(IssueTicketResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.BLOCK_NOT_FOUND,
        ErrorCode.EXPERIENCE_MAP_DAILY_LIMIT_EXCEEDED
    )
    async issueTicket(
        @User('sub') userId: number,
        @Body() body: IssueTicketReqDTO
    ): Promise<IssueTicketResDTO> {
        return this.experienceMapTicketFacade.issueTicket(userId, body.block_id, body.request_id);
    }

    @Post('ticket/read')
    @ApiOperation({
        summary: 'AI 경험 정리 대화 내역 조회용 티켓 발급',
        description:
            '프론트가 AI 서버에서 대화 내역을 조회할 때 쓰는 티켓을 발급합니다. ' +
            '일일 사용 한도를 차감하지 않으며, scope=read라 AI 서버는 이 티켓으로 턴을 실행하지 않습니다. ' +
            '해당 활동의 세션이 없으면 AI 서버 POST /sessions를 호출해 생성합니다.',
    })
    @ApiCommonResponse(IssueReadTicketResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.BLOCK_NOT_FOUND)
    async issueReadTicket(
        @User('sub') userId: number,
        @Body() body: IssueReadTicketReqDTO
    ): Promise<IssueReadTicketResDTO> {
        return this.experienceMapTicketFacade.issueReadTicket(userId, body.block_id);
    }

    @Post('revert')
    @ApiOperation({
        summary: 'AI 커밋 되돌리기',
        description:
            '되돌리기도 하나의 변경이라 map_version은 증가한다. 맵 내용만 이전 시점과 같아진다. ' +
            '최신 AI 커밋이 아니거나 생성 후 24시간이 지나면 되돌릴 수 없다(410). ' +
            'AI 커밋 뒤 다른 변경으로 버전이 달라졌으면 409.',
    })
    @ApiCommonResponse(RevertResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EXPERIENCE_MAP_NOT_INITIALIZED,
        ErrorCode.EXPERIENCE_MAP_VERSION_CONFLICT,
        ErrorCode.EXPERIENCE_MAP_REVERT_EXPIRED
    )
    async revert(@User('sub') userId: number, @Body() body: RevertReqDTO): Promise<RevertResDTO> {
        return this.experienceMapFacade.revert(userId, body.request_id);
    }

    @Get('usage')
    @ApiOperation({
        summary: 'AI 에이전트 일일 사용 횟수 조회',
        description:
            '모든 에이전트 합산, KST 자정 기준으로 초기화된다. 실패한 턴은 사용 횟수에서 제외된다.',
    })
    @ApiCommonResponse(UsageResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getUsage(@User('sub') userId: number): Promise<UsageResDTO> {
        return UsageResDTO.from(await this.aiAgentUsageService.getSummary(userId));
    }

    @Get('activity-status')
    @ApiOperation({
        summary: '활동별 AI 처리 상태 조회',
        description:
            '맵뷰의 활동 상태 아이콘(처리 중/완료/실패)용. 활동마다 가장 최근 요청 1건의 상태를 돌려준다. ' +
            'AI 요청이 한 번도 없는 활동은 목록에 없다. 처리 중인 활동이 있을 때만 주기적으로 다시 조회하면 된다.',
    })
    @ApiCommonResponseArray(ActivityStatusResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getActivityStatuses(@User('sub') userId: number): Promise<ActivityStatusResDTO[]> {
        const items = await this.aiExperienceSessionService.getActivityStatuses(userId);
        return items.map((item) => ActivityStatusResDTO.from(item));
    }

    @Post('activity-status/:blockId/seen')
    @ApiOperation({
        summary: '활동 결과 확인 처리',
        description:
            '채팅을 열었을 때, 그리고 채팅을 연 상태에서 처리가 끝났을 때 호출한다. 해당 활동의 최신 요청을 확인한 것으로 기록한다. ' +
            '최신 요청이 처리 중이면 기록하지 않는다(완료 후 다시 호출). 요청이 없는 활동이어도 성공으로 응답한다. ' +
            '저장 완료된 활동의 ID를 전달해야 하며, 임시 ID나 유효하지 않은 ID는 400으로 거절한다.',
    })
    @ApiParam({
        name: 'blockId',
        type: String,
        example: '12',
        description: '저장된 활동 블록 ID. 1~9223372036854775807 범위의 정수 문자열.',
    })
    @ApiCommonMessageResponse('확인 처리되었습니다.')
    @ApiCommonErrorResponse(ErrorCode.BAD_REQUEST, ErrorCode.UNAUTHORIZED)
    async markSeen(
        @User('sub') userId: number,
        @Param('blockId') blockId: string
    ): Promise<string> {
        if (!/^[1-9]\d{0,18}$/.test(blockId) || BigInt(blockId) > 9223372036854775807n) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }
        await this.aiExperienceSessionService.markSeen(userId, blockId);
        return '확인 처리되었습니다.';
    }
}
