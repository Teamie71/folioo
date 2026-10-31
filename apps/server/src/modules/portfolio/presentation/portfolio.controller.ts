import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { PortfolioDetailResDTO } from '../application/dtos/portfolio.dto';
import { PortfolioService } from '../application/services/portfolio.service';

@ApiTags('Portfolio')
@Controller('portfolios')
export class PortfolioController {
    constructor(private readonly portfolioService: PortfolioService) {}

    @Get(':portfolioId')
    @ApiOperation({
        summary: '개별 포트폴리오 조회',
        description: '경험 정리가 완료된 포트폴리오를 조회합니다.',
    })
    @ApiCommonResponse(PortfolioDetailResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    async getPortfolio(
        @User('sub') userId: number,
        @Param('portfolioId', ParseIntPipe) portfolioId: number
    ): Promise<PortfolioDetailResDTO> {
        return this.portfolioService.getPortfolio(portfolioId, userId);
    }
}
