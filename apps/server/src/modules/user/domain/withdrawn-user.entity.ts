import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('withdrawn_user')
export class WithdrawnUser {
    @PrimaryGeneratedColumn()
    id: number;

    @Index('idx_withdrawn_user_identifier', { unique: true })
    @Column({ name: 'encrypted_identifier', length: 255 })
    encryptedIdentifier: string;

    @Column({ name: 'withdrawn_at', type: 'timestamp with time zone' })
    withdrawnAt: Date;

    @Index('idx_withdrawn_user_expires_at')
    @Column({ name: 'expires_at', type: 'timestamp with time zone' })
    expiresAt: Date;

    static from(encryptedIdentifier: string, now: Date): WithdrawnUser {
        const withdrawnUser = new WithdrawnUser();
        withdrawnUser.encryptedIdentifier = encryptedIdentifier;
        withdrawnUser.withdrawnAt = now;
        withdrawnUser.expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        return withdrawnUser;
    }
}
