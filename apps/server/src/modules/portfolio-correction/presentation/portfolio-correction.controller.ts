import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonMessageResponse,
    ApiCommonResponse,
    ApiCommonResponseArray,
} from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    CorrectionSelectionResDTO,
    CorrectionResDTO,
    CorrectionStatusResDTO,
    CreateCorrectionResDTO,
    CreateCorrectionReqDTO,
    MapCorrectionWithPortfoliosReqDTO,
    UpdateCorrectionTitleReqDTO,
} from '../application/dtos/portfolio-correction.dto';
import { PortfolioCorrectionFacade } from '../application/facades/portfolio-correction.facade';
import { PortfolioCorrectionService } from '../application/services/portfolio-correction.service';
import {
    UpdateCompanyInsightReqDTO,
    UpdateCompanyInsightResDTO,
} from '../application/dtos/company-insight.dto';
import {
    CorrectionItemResDTO,
    CorrectionResultResDTO,
} from '../application/dtos/correction-result.dto';
import { ApiKeywordListResponse } from './decorators/portfolio-correction-swagger.decorator';

@ApiTags('Portfolio-Correction')
@Controller('portfolio-corrections')
export class PortfolioCorrectionController {
    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly portfolioCorrectionFacade: PortfolioCorrectionFacade
    ) {}

    @Get()
    @ApiOperation({
        summary: '첨삭 목록 조회',
        description:
            '포트폴리오 첨삭 목록을 조회합니다. 검색어를 입력하면 제목에 키워드를 포함하는 목록만 조회됩니다.',
    })
    @ApiKeywordListResponse(CorrectionResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getCorrections(
        @User('sub') userId: number,
        @Query('keyword') keyword?: string
    ): Promise<CorrectionResDTO[]> {
        return this.portfolioCorrectionService.getCorrections(userId, keyword);
    }

    @Post()
    @ApiOperation({
        summary: '첨삭 의뢰하기',
        description: '포트폴리오 첨삭을 시작합니다.',
    })
    @ApiCommonResponse(CreateCorrectionResDTO, {
        exampleResult: {
            correctionId: 1,
            message: 'AI 첨삭이 의뢰되었습니다.',
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_MAX_LIMIT)
    async createCorrection(
        @User('sub') userId: number,
        @Body() body: CreateCorrectionReqDTO
    ): Promise<CreateCorrectionResDTO> {
        const correctionId = await this.portfolioCorrectionFacade.requestCorrection(userId, body);
        return {
            correctionId,
            message: 'AI 첨삭이 의뢰되었습니다.',
        };
    }

    @Get(':correctionId/status')
    @ApiOperation({
        summary: '개별 첨삭 상태 조회',
        description: '특정 AI 첨삭의 진행 상태를 조회합니다.',
    })
    @ApiCommonResponse(CorrectionStatusResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    async getCorrectionStatus(
        @User('sub') userId: number,
        @Param('correctionId', ParseIntPipe) correctionId: number
    ): Promise<CorrectionStatusResDTO> {
        return this.portfolioCorrectionService.getStatus(correctionId, userId);
    }

    @Post(':correctionId/company-insight')
    @ApiOperation({
        summary: '기업 분석 정보 생성',
        description: '특정 AI 첨삭의 기업 분석 정보 생성을 시작합니다.',
    })
    @ApiCommonMessageResponse('기업 분석 정보 생성이 시작되었습니다.')
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.CORRECTION_NOT_FOUND,
        ErrorCode.COMPANY_INSIGHT_ALREADY_EXISTS
    )
    async createCompanyInsight(
        @User('sub') userId: number,
        @Param('correctionId', ParseIntPipe) correctionId: number
    ): Promise<string> {
        await this.portfolioCorrectionFacade.requestCompanyInsightCreation(correctionId, userId);
        return '기업 분석 정보 생성이 시작되었습니다.';
    }

    @Get(':correctionId/company-insight')
    @ApiOperation({
        summary: '기업 분석 정보 조회',
        description: '특정 AI 첨삭의 기업 분석 정보를 조회합니다.',
    })
    @ApiCommonResponse(UpdateCompanyInsightResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    async getCompanyInsight(
        @User('sub') userId: number,
        @Param('correctionId', ParseIntPipe) correctionId: number
    ): Promise<UpdateCompanyInsightResDTO> {
        return this.portfolioCorrectionService.getCompanyInsight(correctionId, userId);
    }

    @Patch(':correctionId/company-insight')
    @ApiOperation({
        summary: '기업 분석 정보 수정',
        description:
            'AI가 생성한 기업 분석 정보를 사용자가 수정합니다. 또는 강조 포인트를 추가합니다.',
    })
    @ApiCommonResponse(UpdateCompanyInsightResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.CORRECTION_NOT_FOUND,
        ErrorCode.COMPANY_INSIGHT_NOT_READY
    )
    async updateCompanyInsight(
        @User('sub') userId: number,
        @Param('correctionId', ParseIntPipe) correctionId: number,
        @Body() body: UpdateCompanyInsightReqDTO
    ): Promise<UpdateCompanyInsightResDTO> {
        return this.portfolioCorrectionService.updateCompanyInsight(correctionId, userId, body);
    }

    @Post(':correctionId/select')
    @ApiOperation({
        summary: '포트폴리오 선택',
        description: '첨삭을 진행할 포트폴리오를 선택하고 매핑 테이블에서 활성화합니다.',
    })
    @ApiCommonResponseArray(CorrectionSelectionResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.CORRECTION_NOT_FOUND,
        ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED,
        ErrorCode.PORTFOLIO_NOT_FOUND
    )
    async mapCorrectionWithPortfolios(
        @User('sub') userId: number,
        @Param('correctionId', ParseIntPipe) correctionId: number,
        @Body() body: MapCorrectionWithPortfoliosReqDTO
    ): Promise<CorrectionSelectionResDTO[]> {
        return this.portfolioCorrectionFacade.selectPortfolios(
            correctionId,
            userId,
            body.portfolioIds
        );
    }

    @Post(':correctionId/generate')
    @ApiOperation({
        summary: 'AI 첨삭 생성',
        description:
            '요청 본문 없이 활성화된 포트폴리오 매핑을 기준으로 AI 첨삭 생성 준비를 수행합니다.',
    })
    @ApiCommonResponseArray(CorrectionItemResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.BAD_REQUEST,
        ErrorCode.CORRECTION_NOT_FOUND,
        ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED,
        ErrorCode.PORTFOLIO_NOT_FOUND
    )
    async createCorrectionByAI(
        @User('sub') userId: number,
        @Param('correctionId', ParseIntPipe) correctionId: number
    ): Promise<CorrectionItemResDTO[]> {
        return this.portfolioCorrectionFacade.selectAndGenerate(correctionId, userId);
    }

    @Get(':correctionId')
    @ApiOperation({
        summary: '개별 첨삭 조회',
        description: '특정 AI 첨삭의 결과를 조회합니다.',
    })
    @ApiCommonResponse(CorrectionResultResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    async getCorrection(
        @User('sub') userId: number,
        @Param('correctionId', ParseIntPipe) correctionId: number
    ): Promise<CorrectionResultResDTO> {
        return this.portfolioCorrectionService.getCorrectionDetail(correctionId, userId);
    }

    @Patch(':correctionId')
    @ApiOperation({
        summary: '개별 첨삭 수정',
        description: '특정 AI 첨삭의 제목을 수정합니다.',
    })
    @ApiCommonResponse(CorrectionResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    updateCorrectionTitle(
        @User('sub') userId: number,
        @Param('correctionId', ParseIntPipe) correctionId: number,
        @Body() body: UpdateCorrectionTitleReqDTO
    ): Promise<CorrectionResDTO> {
        return this.portfolioCorrectionService.updateTitle(correctionId, userId, body);
    }

    @Delete(':correctionId')
    @ApiOperation({
        summary: '첨삭 삭제하기',
        description: 'AI 첨삭 내역을 삭제합니다.',
    })
    @ApiCommonMessageResponse('첨삭이 삭제되었습니다.')
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    async deleteCorrection(
        @User('sub') userId: number,
        @Param('correctionId', ParseIntPipe) correctionId: number
    ): Promise<string> {
        await this.portfolioCorrectionService.deleteCorrection(correctionId, userId);
        return '첨삭이 삭제되었습니다.';
    }
}
