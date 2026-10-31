import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { PortfolioCorrection } from './portfolio-correction.entity';

@Entity()
export class CorrectionRagData extends BaseEntity {
    @Column({ length: 500 })
    searchQuery: string;

    @Column({ type: 'jsonb' })
    searchResults: Record<string, unknown>;

    @ManyToOne(() => PortfolioCorrection, { onDelete: 'CASCADE' })
    portfolioCorrection: PortfolioCorrection;

    static create(
        correctionId: number,
        searchQuery: string,
        searchResults: Record<string, unknown>
    ): CorrectionRagData {
        const ragData = new CorrectionRagData();
        ragData.portfolioCorrection = { id: correctionId } as PortfolioCorrection;
        ragData.searchQuery = searchQuery;
        ragData.searchResults = searchResults;
        return ragData;
    }
}
