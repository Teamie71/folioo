import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { PortfolioCorrectionService } from 'src/modules/portfolio-correction/application/services/portfolio-correction.service';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import {
    InternalCorrectionResDTO,
    UpdateCompanyInsightInternalReqDTO,
    UpdateCorrectionStatusReqDTO,
} from '../application/dtos/internal-correction.dto';

@ApiTags('Internal - Corrections')
@Controller('corrections')
export class InternalCorrectionController {
    constructor(private readonly portfolioCorrectionService: PortfolioCorrectionService) {}

    @Get(':correctionId')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: '첨삭 데이터 단건 조회 (Internal)',
        description:
            'AI 서버가 첨삭 데이터를 조회합니다. RAG 시작 시 company_name, job_title 등을 읽고, 첨삭 생성 시 company_insight를 읽습니다.',
    })
    @ApiCommonResponse(InternalCorrectionResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    async getCorrection(
        @Param('correctionId', ParseIntPipe) correctionId: number
    ): Promise<InternalCorrectionResDTO> {
        const payload =
            await this.portfolioCorrectionService.getInternalCorrectionDetail(correctionId);
        return InternalCorrectionResDTO.from(payload);
    }

    @Patch(':correctionId/status')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: '첨삭 상태 변경 (Internal)',
        description:
            '첨삭 상태를 변경합니다. 유효한 전이: NOT_STARTED→DOING_RAG, COMPANY_INSIGHT→GENERATING, Any→FAILED',
    })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.CORRECTION_NOT_FOUND,
        ErrorCode.CORRECTION_INVALID_STATUS_TRANSITION
    )
    async updateCorrectionStatus(
        @Param('correctionId', ParseIntPipe) correctionId: number,
        @Body() body: UpdateCorrectionStatusReqDTO
    ): Promise<string> {
        await this.portfolioCorrectionService.updateStatusWithTransition(correctionId, body.status);
        return '첨삭 상태가 변경되었습니다.';
    }

    @Patch(':correctionId/company-insight')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: '기업 분석 저장 + 상태 전이 (Internal)',
        description:
            'RAG 파이프라인 완료 후 기업 분석 결과를 저장하고 status를 COMPANY_INSIGHT로 변경합니다.',
    })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.CORRECTION_NOT_FOUND,
        ErrorCode.CORRECTION_INVALID_STATUS_TRANSITION
    )
    async saveCompanyInsight(
        @Param('correctionId', ParseIntPipe) correctionId: number,
        @Body() body: UpdateCompanyInsightInternalReqDTO
    ): Promise<string> {
        await this.portfolioCorrectionService.saveCompanyInsightInternal(
            correctionId,
            body.companyInsight
        );
        return '기업 분석이 저장되었습니다.';
    }
}
