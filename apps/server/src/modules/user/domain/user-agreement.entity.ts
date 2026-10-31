import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Term } from './term.entity';

@Entity('user_agreement')
@Index(['userId', 'termId'], { unique: true })
export class UserAgreement extends BaseEntity {
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => Term, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'term_id' })
    term: Term;

    @Column({ name: 'term_id' })
    termId: number;

    @Column({ name: 'is_agree' })
    isAgree: boolean;

    @Column({ name: 'agree_at', type: 'timestamptz', nullable: true })
    agreeAt: Date | null;

    static create(
        userId: number,
        termId: number,
        isAgree: boolean,
        agreeAt: Date | null
    ): UserAgreement {
        const agreement = new UserAgreement();
        agreement.userId = userId;
        agreement.termId = termId;
        agreement.isAgree = isAgree;
        agreement.agreeAt = agreeAt;
        return agreement;
    }
}
