import { BaseEntity } from 'src/common/entities/base.entity';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { PortfolioCorrection } from './portfolio-correction.entity';

@Entity()
export class CorrectionItem extends BaseEntity {
    @Column({
        type: 'jsonb',
        nullable: true,
    })
    description: Record<string, unknown>;

    @Column({
        type: 'jsonb',
        nullable: true,
    })
    responsibilities: Record<string, unknown>;

    @Column({
        type: 'jsonb',
        nullable: true,
    })
    problemSolving: Record<string, unknown>;

    @Column({
        type: 'jsonb',
        nullable: true,
    })
    learnings: Record<string, unknown>;

    @ManyToOne(() => PortfolioCorrection, { onDelete: 'CASCADE' })
    portfolioCorrection: PortfolioCorrection;

    @ManyToOne(() => Portfolio, { onDelete: 'RESTRICT' })
    portfolio: Portfolio;

    static create(portfolio: Portfolio, portfolioCorrection: PortfolioCorrection): CorrectionItem {
        const item = new CorrectionItem();
        item.portfolio = portfolio;
        item.portfolioCorrection = portfolioCorrection;
        return item;
    }
}
