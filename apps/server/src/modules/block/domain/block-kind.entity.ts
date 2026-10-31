import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BlockKind } from './enums/block-kind.enum';

@Entity('block_kind')
export class BlockKindEntity {
    @PrimaryColumn({ type: 'enum', enum: BlockKind, enumName: 'block_kind_enum' })
    kind: BlockKind;

    @Column({ name: 'is_text_editable' })
    isTextEditable: boolean;

    @Column({ name: 'is_deletable' })
    isDeletable: boolean;

    @Column({ name: 'fixed_level', type: 'smallint', nullable: true })
    fixedLevel: number | null;

    @Column({ type: 'text' })
    placeholder: string;
}
