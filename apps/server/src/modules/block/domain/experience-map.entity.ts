import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/domain/user.entity';

@Entity('experience_map')
export class ExperienceMap {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'map_version', type: 'bigint', default: 1 })
    mapVersion: string;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
