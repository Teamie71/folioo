import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('headlines')
@Unique('headlines_value_trait_uq', ['topValue', 'topTrait'])
export class Headline {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'top_value' })
    topValue: string; // ValueKind

    @Column({ name: 'top_trait' })
    topTrait: string; // TraitKind

    @Column({ type: 'text' })
    text: string;
}
