import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorrectionItem } from '../../domain/correction-item.entity';

@Injectable()
export class CorrectionItemRepository {
    constructor(
        @InjectRepository(CorrectionItem)
        private readonly correctionItemRepository: Repository<CorrectionItem>
    ) {}

    save(correctionItem: CorrectionItem): Promise<CorrectionItem> {
        return this.correctionItemRepository.save(correctionItem);
    }

    saveAll(correctionItems: CorrectionItem[]): Promise<CorrectionItem[]> {
        return this.correctionItemRepository.save(correctionItems);
    }

    async findPortfolioIdsByCorrectionId(correctionId: number): Promise<number[]> {
        const results = await this.correctionItemRepository
            .createQueryBuilder('ci')
            .select('ci.portfolio', 'portfolioId')
            .where('ci.portfolioCorrection = :correctionId', { correctionId })
            .getRawMany<{ portfolioId: number }>();
        return results.map((r) => r.portfolioId);
    }

    findByCorrectionId(correctionId: number): Promise<CorrectionItem[]> {
        return this.correctionItemRepository.find({
            where: { portfolioCorrection: { id: correctionId } },
            relations: ['portfolio'],
            order: { createdAt: 'ASC' },
        });
    }

    countByCorrectionId(correctionId: number): Promise<number> {
        return this.correctionItemRepository.count({
            where: { portfolioCorrection: { id: correctionId } },
        });
    }

    async deleteByCorrectionId(correctionId: number): Promise<number> {
        const result = await this.correctionItemRepository.delete({
            portfolioCorrection: { id: correctionId },
        });
        return result.affected ?? 0;
    }

    async deleteByPortfolioId(portfolioId: number): Promise<number> {
        const result = await this.correctionItemRepository.delete({
            portfolio: { id: portfolioId },
        });
        return result.affected ?? 0;
    }
}
