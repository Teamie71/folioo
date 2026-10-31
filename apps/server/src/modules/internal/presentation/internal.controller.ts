import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { InternalHealthResDTO } from '../application/dtos/internal-health.dto';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { InternalPortfolioDetailResDTO } from '../application/dtos/internal-portfolio.dto';
import { InternalPortfolioFacade } from '../application/facades/internal-portfolio.facade';

@ApiTags('Internal')
@Controller('internal')
export class InternalController {
    constructor(private readonly internalPortfolioFacade: InternalPortfolioFacade) {}

    @Get('health')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: 'Internal API health check',
        description: 'Verifies internal API key authentication and routing.',
    })
    @ApiCommonResponse(InternalHealthResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.INTERNAL_SERVER_ERROR)
    getHealth(): InternalHealthResDTO {
        return InternalHealthResDTO.ok();
    }

    @Get('portfolios/:portfolioId')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: '포트폴리오 원문 조회 (Internal)',
        description: 'AI 서버가 첨삭 생성 시 원문 조회를 위해 사용합니다.',
    })
    @ApiCommonResponse(InternalPortfolioDetailResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    async getInternalPortfolio(
        @Param('portfolioId', ParseIntPipe) portfolioId: number
    ): Promise<InternalPortfolioDetailResDTO> {
        return this.internalPortfolioFacade.getPortfolioDetail(portfolioId);
    }
}
