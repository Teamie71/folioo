import { Injectable } from '@nestjs/common';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { CorrectionPortfolioSelection } from '../../domain/correction-portfolio-selection.entity';
import { CorrectionPortfolioSelectionRepository } from '../../infrastructure/repositories/correction-portfolio-selection.repository';

@Injectable()
export class CorrectionPortfolioSelectionService {
    constructor(
        private readonly correctionPortfolioSelectionRepository: CorrectionPortfolioSelectionRepository
    ) {}

    async activateSelections(
        correction: PortfolioCorrection,
        portfolios: Portfolio[]
    ): Promise<CorrectionPortfolioSelection[]> {
        const existingSelections =
            await this.correctionPortfolioSelectionRepository.findByCorrectionId(correction.id);
        const selectedPortfolioIds = new Set(portfolios.map((portfolio) => portfolio.id));
        const existingSelectionMap = new Map(
            existingSelections.map((selection) => [selection.portfolio.id, selection])
        );

        for (const selection of existingSelections) {
            selection.isActive = selectedPortfolioIds.has(selection.portfolio.id);
        }

        const newSelections = portfolios
            .filter((portfolio) => !existingSelectionMap.has(portfolio.id))
            .map((portfolio) => CorrectionPortfolioSelection.create(portfolio, correction, true));

        return this.correctionPortfolioSelectionRepository.saveAll([
            ...existingSelections,
            ...newSelections,
        ]);
    }

    async findActivePortfolioIdsByCorrectionId(correctionId: number): Promise<number[]> {
        const activeSelections =
            await this.correctionPortfolioSelectionRepository.findActiveByCorrectionId(
                correctionId
            );
        return activeSelections.map((selection) => selection.portfolio.id);
    }

    async existsByPortfolioId(portfolioId: number): Promise<boolean> {
        return this.correctionPortfolioSelectionRepository.existsByPortfolioId(portfolioId);
    }

    async deleteByPortfolioId(portfolioId: number): Promise<void> {
        await this.correctionPortfolioSelectionRepository.deleteByPortfolioId(portfolioId);
    }
}
