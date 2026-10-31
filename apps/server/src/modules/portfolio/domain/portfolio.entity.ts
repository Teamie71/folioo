import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { SourceType } from './enums/source-type.enum';
import { PortfolioStatus } from './enums/portfolio-status.enum';
import { User } from '../../user/domain/user.entity';
import { Experience } from '../../experience/domain/experience.entity';

export const MAX_EXTERNAL_PORTFOLIO_BLOCKS = 5;
export const PORTFOLIO_NAME_MAX_LENGTH = 20;
export const PORTFOLIO_BLOCK_FIELD_MAX_LENGTH = 1000;

@Entity()
export class Portfolio extends BaseEntity {
    @Column({ length: PORTFOLIO_NAME_MAX_LENGTH })
    name: string;

    @Column({ length: PORTFOLIO_BLOCK_FIELD_MAX_LENGTH })
    description: string;

    @Column({ length: PORTFOLIO_BLOCK_FIELD_MAX_LENGTH })
    responsibilities: string;

    @Column({ length: PORTFOLIO_BLOCK_FIELD_MAX_LENGTH })
    problemSolving: string;

    @Column({ length: PORTFOLIO_BLOCK_FIELD_MAX_LENGTH })
    learnings: string;

    @Column({ nullable: true })
    contributionRate: number;

    @Column({
        type: 'enum',
        enum: PortfolioStatus,
        default: PortfolioStatus.NOT_STARTED,
    })
    status: PortfolioStatus;

    @Column({
        type: 'enum',
        enum: SourceType,
        default: SourceType.INTERNAL,
    })
    sourceType: SourceType;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @OneToOne(() => Experience, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn()
    experience: Experience;

    static createExternal(userId: number): Portfolio {
        const portfolio = new Portfolio();
        portfolio.name = '';
        portfolio.description = '';
        portfolio.responsibilities = '';
        portfolio.problemSolving = '';
        portfolio.learnings = '';
        portfolio.sourceType = SourceType.EXTERNAL;
        portfolio.user = { id: userId } as User;
        return portfolio;
    }
}
