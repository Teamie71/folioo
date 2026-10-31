import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/domain/user.entity';
import { BlockKind } from './enums/block-kind.enum';

export const BLOCK_CONTENT_MAX_LENGTH = 500;
export const BLOCK_NAME_MAX_LENGTH = 20;
export const BLOCK_MAX_LEVEL = 5;

@Entity('block')
@Unique(['id', 'kind'])
@Index(['userId'])
@Index(['parentId'])
export class Block {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => Block, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'parent_id' })
    parent: Block | null;

    @Column({ name: 'parent_id', type: 'bigint', nullable: true })
    parentId: string | null;

    @Column({ type: 'smallint' })
    level: number;

    @Column({ type: 'enum', enum: BlockKind, enumName: 'block_kind_enum' })
    kind: BlockKind;

    @Column({ type: 'int' })
    position: number;

    @Column({ type: 'varchar', length: BLOCK_CONTENT_MAX_LENGTH, nullable: true })
    content: string | null;

    @Column({ type: 'text', nullable: true })
    placeholder: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
