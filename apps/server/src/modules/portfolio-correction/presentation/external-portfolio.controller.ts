import {
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Req,
    Body,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonMessageResponse,
    ApiCommonResponse,
} from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    CreateExternalPortfolioReqDTO,
    ExternalPortfolioListResDTO,
    StructuredPortfolioResDTO,
    UpdatePortfolioBlockReqDTO,
} from '../application/dtos/external-portfolio.dto';
import { ExternalPortfolioFacade } from '../application/facades/external-portfolio.facade';
import {
    ApiCorrectionIdResponse,
    ApiExternalPortfolioExtractRequest,
} from './decorators/portfolio-correction-swagger.decorator';
import { ExternalPortfolioExtractRequestParserService } from './services/external-portfolio-extract-request-parser.service';

@ApiTags('Portfolio')
@Controller('external-portfolios')
export class ExternalPortfolioController {
    constructor(
        private readonly externalPortfolioFacade: ExternalPortfolioFacade,
        private readonly extractRequestParser: ExternalPortfolioExtractRequestParserService
    ) {}

    @Post('extract')
    @ApiOperation({
        summary: 'PDF 포트폴리오 추출 요청 위임',
        description:
            'PDF를 AI 서버에 전달해 추출·구조화 작업을 비동기로 접수합니다. 결과는 서버 간 콜백 후 조회 API로 확인합니다.',
    })
    @ApiExternalPortfolioExtractRequest()
    @ApiCommonMessageResponse('추출 요청이 접수되었습니다. 처리 완료 후 결과를 조회해 주세요.')
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_EXTRACT_FAILED)
    async extractPortfolios(@User('sub') userId: number, @Req() req: Request): Promise<string> {
        const { correctionId, fileBuffer, fileName } = await this.extractRequestParser.parse(req);
        return this.externalPortfolioFacade.extractPortfolio(
            userId,
            correctionId,
            fileBuffer,
            fileName
        );
    }

    @Post()
    @ApiOperation({
        summary: 'PDF 포트폴리오 활동 블록 추가',
        description:
            '텍스트 정리 블록의 활동 블록을 추가합니다. 활동 블록은 최대 5개까지 존재 가능합니다.',
    })
    @ApiBody({ type: CreateExternalPortfolioReqDTO })
    @ApiCommonResponse(StructuredPortfolioResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.CORRECTION_NOT_FOUND,
        ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED
    )
    async createExternalPortfolioBlock(
        @User('sub') userId: number,
        @Body() body: CreateExternalPortfolioReqDTO
    ): Promise<StructuredPortfolioResDTO> {
        return this.externalPortfolioFacade.createExternalPortfolioBlock(body.correctionId, userId);
    }

    @Get()
    @ApiOperation({
        summary: 'PDF 포트폴리오 텍스트 정리 결과 조회',
        description: 'AI가 구조화한 포트폴리오 정보를 조회합니다.',
    })
    @ApiCorrectionIdResponse(ExternalPortfolioListResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    async getSelectedPortfolios(
        @User('sub') userId: number,
        @Query('correctionId', ParseIntPipe) correctionId: number
    ): Promise<ExternalPortfolioListResDTO> {
        return this.externalPortfolioFacade.getSelectedPortfolios(correctionId, userId);
    }

    @Patch(':portfolioId')
    @ApiOperation({
        summary: 'PDF 포트폴리오 텍스트 정리 결과 수정',
        description: 'AI가 구조화한 포트폴리오 정보를 수정합니다.',
    })
    @ApiCommonResponse(StructuredPortfolioResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    async updateExternalPortfolio(
        @User('sub') userId: number,
        @Param('portfolioId', ParseIntPipe) portfolioId: number,
        @Body() body: UpdatePortfolioBlockReqDTO
    ): Promise<StructuredPortfolioResDTO> {
        return this.externalPortfolioFacade.updateExternalPortfolio(portfolioId, userId, body);
    }

    @Delete(':portfolioId')
    @ApiOperation({
        summary: 'PDF 포트폴리오 텍스트 정리 결과 삭제',
        description:
            'AI가 구조화한 포트폴리오 활동을 삭제합니다. 연결된 첨삭 선택/결과는 자동으로 해제됩니다. (활동 옆 마이너스 버튼을 눌러 활성화)',
    })
    @ApiCommonMessageResponse('포트폴리오가 삭제되었습니다.')
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    async deleteExternalPortfolio(
        @User('sub') userId: number,
        @Param('portfolioId', ParseIntPipe) portfolioId: number
    ): Promise<string> {
        await this.externalPortfolioFacade.deleteExternalPortfolio(portfolioId, userId);
        return '포트폴리오가 삭제되었습니다.';
    }
}
