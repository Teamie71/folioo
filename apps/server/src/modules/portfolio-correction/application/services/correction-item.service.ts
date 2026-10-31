import { Injectable } from '@nestjs/common';
import { CorrectionItemRepository } from '../../infrastructure/repositories/correction-item.repository';
import { CorrectionItem } from '../../domain/correction-item.entity';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';

@Injectable()
export class CorrectionItemService {
    constructor(private readonly correctionItemRepository: CorrectionItemRepository) {}

    saveCorrectionItem(correctionItem: CorrectionItem): Promise<CorrectionItem> {
        return this.correctionItemRepository.save(correctionItem);
    }

    saveAll(correctionItems: CorrectionItem[]): Promise<CorrectionItem[]> {
        return this.correctionItemRepository.saveAll(correctionItems);
    }

    async createCorrectionItem(
        portfolio: Portfolio,
        correction: PortfolioCorrection
    ): Promise<CorrectionItem> {
        const item = CorrectionItem.create(portfolio, correction);
        return this.correctionItemRepository.save(item);
    }

    async findPortfolioIdsByCorrectionId(correctionId: number): Promise<number[]> {
        return this.correctionItemRepository.findPortfolioIdsByCorrectionId(correctionId);
    }

    findByCorrectionId(correctionId: number): Promise<CorrectionItem[]> {
        return this.correctionItemRepository.findByCorrectionId(correctionId);
    }

    countItemsByCorrectionId(correctionId: number): Promise<number> {
        return this.correctionItemRepository.countByCorrectionId(correctionId);
    }

    async deleteByCorrectionId(correctionId: number): Promise<void> {
        await this.correctionItemRepository.deleteByCorrectionId(correctionId);
    }

    async deleteByPortfolioId(portfolioId: number): Promise<void> {
        await this.correctionItemRepository.deleteByPortfolioId(portfolioId);
    }
}
