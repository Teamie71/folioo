import { BaseEntity } from '../../../../common/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

export enum AuthTokenType {
    REFRESH = 'REFRESH',
    ACCESS_BLACKLIST = 'ACCESS_BLACKLIST',
}

@Entity('auth_token')
@Index(['type', 'token'])
export class AuthToken extends BaseEntity {
    static create(
        type: AuthTokenType,
        token: string,
        expiresAt: Date,
        userId: number | null = null
    ): AuthToken {
        const entity = new AuthToken();
        entity.type = type;
        entity.token = token;
        entity.userId = userId;
        entity.expiresAt = expiresAt;
        return entity;
    }

    @Column({ type: 'enum', enum: AuthTokenType })
    type: AuthTokenType;

    /** 토큰 원문 대신 SHA-256 digest를 저장한다. */
    @Column({ type: 'text' })
    token: string;

    @Column({ name: 'user_id', type: 'integer', nullable: true })
    userId: number | null;

    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt: Date;
}
