import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import {
    ApiCommonErrorResponse,
    ApiCommonMessageResponse,
    ApiCommonResponse,
} from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { TemplateCatalogService } from '../application/services/template-catalog.service';
import { InternalTemplateCatalogResDTO } from '../application/dtos/internal-template.dto';
import { ExperienceMapFacade } from '../application/facades/experience-map.facade';
import {
    CommitReqDTO,
    CommitResDTO,
    CommitStatusResDTO,
} from '../application/dtos/experience-map-commit.dto';
import { MarkRequestFailedReqDTO } from '../application/dtos/experience-map-usage.dto';
import { AiAgentUsageService } from '../application/services/ai-agent-usage.service';

// 경로는 docs/development/INTERNAL_API_PATTERN.md의 `/internal/*` 규칙을 따르지 않고
// AI 서버와 고정된 계약 경로(`/api/v1/experience-map/*`)를 그대로 쓴다.
// 인증(X-API-Key)과 컨트롤러 분리(공개 컨트롤러에 섞지 않음) 원칙은 그대로 지킨다.
@ApiTags('ExperienceMap - Internal (AI)')
@Controller('api/v1/experience-map')
export class ExperienceMapInternalController {
    constructor(
        private readonly templateCatalogService: TemplateCatalogService,
        private readonly experienceMapFacade: ExperienceMapFacade,
        private readonly aiAgentUsageService: AiAgentUsageService
    ) {}

    @Get('templates')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'AI 서버 콜백용 내부 API 키 (MAIN_BACKEND_API_KEY)',
    })
    @ApiOperation({
        summary: '블록 템플릿 카탈로그 조회 (AI 서버용)',
        description:
            'AI 서버가 기동 시 1회 조회 후 1시간 TTL로 캐시한다. ' +
            'unknown_slot_id(422) 응답을 받으면 즉시 재조회한다. ' +
            '문구가 바뀌면 version이 갱신된다.',
    })
    @ApiCommonResponse(InternalTemplateCatalogResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    getTemplates(): InternalTemplateCatalogResDTO {
        return this.templateCatalogService.getInternalCatalog();
    }

    @Post('commit')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'AI 서버 콜백용 내부 API 키 (MAIN_BACKEND_API_KEY)',
    })
    @ApiOperation({
        summary: '경험 맵 커밋 (AI 서버용)',
        description:
            '경험 맵 쓰기는 이 API 하나로 모인다. (user_id, request_id) 기준으로 멱등하며, ' +
            '이미 커밋된 요청은 재실행하지 않고 저장된 결과를 그대로 반환한다. ' +
            'base_map_version이 현재 값과 다르면 409(map_version_conflict)로 거부한다.',
    })
    @ApiCommonResponse(CommitResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EXPERIENCE_MAP_NOT_INITIALIZED,
        ErrorCode.EXPERIENCE_MAP_VERSION_CONFLICT,
        ErrorCode.EXPERIENCE_MAP_REQUEST_ID_REUSED,
        ErrorCode.EXPERIENCE_MAP_INVALID_HIERARCHY,
        ErrorCode.EXPERIENCE_MAP_INVALID_TARGET,
        ErrorCode.EXPERIENCE_MAP_UNKNOWN_SLOT_ID,
        ErrorCode.BLOCK_SECTION_ALREADY_EXISTS
    )
    async commit(@Body() body: CommitReqDTO): Promise<CommitResDTO> {
        return this.experienceMapFacade.commit(body);
    }

    @Get('commit/:requestId')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'AI 서버 콜백용 내부 API 키 (MAIN_BACKEND_API_KEY)',
    })
    @ApiOperation({
        summary: '커밋 결과 조회 (AI 서버 크래시 복구용)',
        description:
            'AI 서버가 커밋 응답을 받기 전에 죽었을 때 실제로 커밋됐는지 확인한다. ' +
            'committed=false면 재커밋할 수 있다는 뜻이다.',
    })
    @ApiCommonResponse(CommitStatusResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getCommitStatus(@Param('requestId') requestId: string): Promise<CommitStatusResDTO> {
        return this.experienceMapFacade.getCommitStatus(requestId);
    }

    @Post('usage/failed')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'AI 서버 콜백용 내부 API 키 (MAIN_BACKEND_API_KEY)',
    })
    @ApiOperation({
        summary: '실패한 턴을 일일 사용 횟수에서 제외 (AI 서버용)',
        description:
            '턴이 실패로 끝나면 호출한다. 해당 request_id는 사용 횟수에서 빠지고, ' +
            '같은 request_id로 재시도하면 다시 차감된다. 멱등하며 없는 request_id는 무시한다.',
    })
    @ApiCommonMessageResponse('실패 처리되었습니다.')
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async markRequestFailed(@Body() body: MarkRequestFailedReqDTO): Promise<string> {
        await this.aiAgentUsageService.markFailed(Number(body.user_id), body.request_id);
        return '실패 처리되었습니다.';
    }
}
