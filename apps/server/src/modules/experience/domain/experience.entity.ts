import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { JobCategory } from './enums/job-category.enum';
import { ExperienceStatus } from './enums/experience-status.enum';
import { User } from '../../user/domain/user.entity';

@Entity()
export class Experience extends BaseEntity {
    @Column({ length: 20 })
    name: string;

    @Column({
        type: 'enum',
        enum: JobCategory,
        default: JobCategory.NONE,
    })
    hopeJob: JobCategory;

    @Column({
        type: 'enum',
        enum: ExperienceStatus,
        default: ExperienceStatus.ON_CHAT,
    })
    status: ExperienceStatus;

    @Column({ name: 'session_id', type: 'uuid', nullable: true, unique: true })
    sessionId: string | null;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;
}
