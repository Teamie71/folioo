import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Block } from './block.entity';
import { BlockKind } from './enums/block-kind.enum';

@Entity('review')
@Index(['blockId'])
export class Review {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Column({ name: 'block_id', type: 'bigint' })
    blockId: string;

    @Column({
        name: 'block_kind',
        type: 'enum',
        enum: BlockKind,
        enumName: 'block_kind_enum',
        default: BlockKind.EXPERIENCE,
    })
    blockKind: BlockKind;

    @ManyToOne(() => Block, { onDelete: 'CASCADE' })
    @JoinColumn([
        { name: 'block_id', referencedColumnName: 'id' },
        { name: 'block_kind', referencedColumnName: 'kind' },
    ])
    block: Block;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
}
