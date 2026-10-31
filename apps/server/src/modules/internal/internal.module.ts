import { Module } from '@nestjs/common';
import { InternalController } from './presentation/internal.controller';
import { InternalCorrectionController } from './presentation/internal-correction.controller';
import { InternalCorrectionResultController } from './presentation/internal-correction-result.controller';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { InternalPortfolioFacade } from './application/facades/internal-portfolio.facade';
import { PortfolioCorrectionModule } from '../portfolio-correction/portfolio-correction.module';
import { InternalCorrectionResultFacade } from './application/facades/internal-correction-result.facade';
import { InternalPdfExtractionResultController } from './presentation/internal-pdf-extraction-result.controller';

@Module({
    imports: [PortfolioModule, PortfolioCorrectionModule],
    controllers: [
        InternalController,
        InternalCorrectionController,
        InternalCorrectionResultController,
        InternalPdfExtractionResultController,
    ],
    providers: [InternalApiKeyGuard, InternalPortfolioFacade, InternalCorrectionResultFacade],
})
export class InternalModule {}
