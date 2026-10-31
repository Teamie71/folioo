import { BaseEntity } from 'src/common/entities/base.entity';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';
import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { PortfolioCorrection } from './portfolio-correction.entity';

@Entity()
@Unique(['portfolioCorrection', 'portfolio'])
export class CorrectionPortfolioSelection extends BaseEntity {
    @ManyToOne(() => PortfolioCorrection, { onDelete: 'CASCADE' })
    portfolioCorrection: PortfolioCorrection;

    @ManyToOne(() => Portfolio, { onDelete: 'RESTRICT' })
    portfolio: Portfolio;

    @Column({ default: false })
    isActive: boolean;

    static create(
        portfolio: Portfolio,
        portfolioCorrection: PortfolioCorrection,
        isActive: boolean
    ): CorrectionPortfolioSelection {
        const selection = new CorrectionPortfolioSelection();
        selection.portfolio = portfolio;
        selection.portfolioCorrection = portfolioCorrection;
        selection.isActive = isActive;
        return selection;
    }
}
