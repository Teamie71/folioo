import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { PortfolioCorrectionService } from 'src/modules/portfolio-correction/application/services/portfolio-correction.service';
import { CorrectionRagDataService } from 'src/modules/portfolio-correction/application/services/correction-rag-data.service';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import {
    CreateRagDataReqDTO,
    RagDataResDTO,
    SaveCorrectionResultReqDTO,
} from '../application/dtos/internal-correction-result.dto';

@ApiTags('Internal - Corrections')
@Controller('corrections')
export class InternalCorrectionResultController {
    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly correctionRagDataService: CorrectionRagDataService
    ) {}

    @Patch(':correctionId/result')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: '첨삭 결과 저장 + 상태 전이 (Internal)',
        description: '첨삭 LLM 생성 완료 후 결과를 저장하고 status를 DONE으로 변경합니다.',
    })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.CORRECTION_NOT_FOUND,
        ErrorCode.CORRECTION_INVALID_STATUS_TRANSITION
    )
    async saveCorrectionResult(
        @Param('correctionId', ParseIntPipe) correctionId: number,
        @Body() body: SaveCorrectionResultReqDTO
    ): Promise<string> {
        const items = body.result.map((item) => ({
            portfolioId: item.portfolioId,
            data: {
                description: item.description as unknown as Record<string, unknown>,
                responsibilities: item.responsibilities as unknown as Record<string, unknown>,
                problemSolving: item.problemSolving as unknown as Record<string, unknown>,
                learnings: item.learnings as unknown as Record<string, unknown>,
            },
        }));
        await this.portfolioCorrectionService.saveCorrectionResult(
            correctionId,
            items,
            body.overallReview
        );
        return '첨삭 결과가 저장되었습니다.';
    }

    @Post(':correctionId/rag-data')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: 'RAG 검색 결과 저장 (Internal)',
        description: 'RAG 파이프라인의 Tavily 검색 결과를 저장합니다.',
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    @HttpCode(HttpStatus.CREATED)
    async createRagData(
        @Param('correctionId', ParseIntPipe) correctionId: number,
        @Body() body: CreateRagDataReqDTO
    ): Promise<string> {
        await this.correctionRagDataService.createRagData(
            correctionId,
            body.searchQuery,
            body.searchResults
        );
        return 'RAG 데이터가 저장되었습니다.';
    }

    @Get(':correctionId/rag-data')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: 'RAG 검색 결과 조회 (Internal)',
        description: '저장된 RAG 검색 결과를 조회합니다. createdAt 오름차순 정렬.',
    })
    @ApiCommonResponse(RagDataResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    async getRagData(
        @Param('correctionId', ParseIntPipe) correctionId: number
    ): Promise<RagDataResDTO[]> {
        const ragDataList = await this.correctionRagDataService.findByCorrectionId(correctionId);
        return ragDataList.map((ragData) => RagDataResDTO.from(ragData, correctionId));
    }
}
