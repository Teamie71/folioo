import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorrectionPortfolioSelection } from '../../domain/correction-portfolio-selection.entity';

@Injectable()
export class CorrectionPortfolioSelectionRepository {
    constructor(
        @InjectRepository(CorrectionPortfolioSelection)
        private readonly correctionPortfolioSelectionRepository: Repository<CorrectionPortfolioSelection>
    ) {}

    saveAll(selections: CorrectionPortfolioSelection[]): Promise<CorrectionPortfolioSelection[]> {
        return this.correctionPortfolioSelectionRepository.save(selections);
    }

    findByCorrectionId(correctionId: number): Promise<CorrectionPortfolioSelection[]> {
        return this.correctionPortfolioSelectionRepository.find({
            where: { portfolioCorrection: { id: correctionId } },
            relations: ['portfolio'],
            order: { createdAt: 'ASC' },
        });
    }

    findActiveByCorrectionId(correctionId: number): Promise<CorrectionPortfolioSelection[]> {
        return this.correctionPortfolioSelectionRepository.find({
            where: {
                portfolioCorrection: { id: correctionId },
                isActive: true,
            },
            relations: ['portfolio'],
            order: { createdAt: 'ASC' },
        });
    }

    existsByPortfolioId(portfolioId: number): Promise<boolean> {
        return this.correctionPortfolioSelectionRepository.exists({
            where: { portfolio: { id: portfolioId } },
        });
    }

    async deleteByPortfolioId(portfolioId: number): Promise<number> {
        const result = await this.correctionPortfolioSelectionRepository.delete({
            portfolio: { id: portfolioId },
        });
        return result.affected ?? 0;
    }
}
