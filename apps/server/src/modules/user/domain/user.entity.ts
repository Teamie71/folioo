import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity } from 'typeorm';
import { UserStatus } from './enums/user-status.enum';

@Entity('users')
export class User extends BaseEntity {
    @Column({ length: 25 })
    name: string;

    @Column({
        unique: true,
        nullable: true,
        length: 11,
    })
    phoneNum: string;

    @Column({
        type: 'enum',
        enum: UserStatus,
        enumName: 'users_status_enum',
        default: UserStatus.PENDING,
    })
    status: UserStatus;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    deactivatedAt: Date;

    isDeactivated(): boolean {
        return !this.isActive;
    }

    static createPendingUser(name: string): User {
        const user = new User();
        user.name = name;
        user.status = UserStatus.PENDING;
        return user;
    }
}
