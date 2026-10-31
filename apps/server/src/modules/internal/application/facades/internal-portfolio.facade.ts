import { Injectable } from '@nestjs/common';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import { InternalPortfolioDetailResDTO } from '../dtos/internal-portfolio.dto';

@Injectable()
export class InternalPortfolioFacade {
    constructor(private readonly portfolioService: PortfolioService) {}

    async getPortfolioDetail(portfolioId: number): Promise<InternalPortfolioDetailResDTO> {
        const portfolio = await this.portfolioService.findByIdWithExperienceOrThrow(portfolioId);
        return InternalPortfolioDetailResDTO.from(portfolio);
    }
}
