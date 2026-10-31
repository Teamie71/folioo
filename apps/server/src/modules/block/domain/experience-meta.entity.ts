import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from 'typeorm';
import { Block } from './block.entity';
import { BlockKind } from './enums/block-kind.enum';
import { Experience } from '../../experience/domain/experience.entity';
import { SourceType } from '../../portfolio/domain/enums/source-type.enum';
import { PortfolioStatus } from '../../portfolio/domain/enums/portfolio-status.enum';

@Entity('experience_meta')
export class ExperienceMeta {
    @PrimaryColumn({ name: 'block_id', type: 'bigint' })
    blockId: string;

    @Column({
        name: 'block_kind',
        type: 'enum',
        enum: BlockKind,
        enumName: 'block_kind_enum',
        default: BlockKind.EXPERIENCE,
    })
    blockKind: BlockKind;

    @OneToOne(() => Block, { onDelete: 'CASCADE' })
    @JoinColumn([
        { name: 'block_id', referencedColumnName: 'id' },
        { name: 'block_kind', referencedColumnName: 'kind' },
    ])
    block: Block;

    @Column({ name: 'contribution_rate', type: 'int', nullable: true })
    contributionRate: number | null;

    @Column({
        name: 'source_type',
        type: 'enum',
        enum: SourceType,
        enumName: 'portfolio_source_type_enum',
        default: SourceType.INTERNAL,
    })
    sourceType: SourceType;

    @Column({
        name: 'status',
        type: 'enum',
        enum: PortfolioStatus,
        enumName: 'portfolio_status_enum',
        default: PortfolioStatus.NOT_STARTED,
    })
    status: PortfolioStatus;

    @ManyToOne(() => Experience, { nullable: true })
    @JoinColumn({ name: 'experience_id' })
    experience: Experience | null;

    @Column({ name: 'experience_id', nullable: true, unique: true })
    experienceId: number | null;
}
