import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity } from 'typeorm';
import { TermType } from './enums/term-type.enum';

@Entity('term')
export class Term extends BaseEntity {
    @Column({
        type: 'enum',
        enum: TermType,
        name: 'term_type',
    })
    termType: TermType;

    @Column({ length: 10 })
    version: string;

    @Column({ name: 'is_required' })
    isRequired: boolean;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;
}
