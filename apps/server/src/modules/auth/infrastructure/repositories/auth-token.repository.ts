import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { AuthToken, AuthTokenType } from '../../domain/entities/auth-token.entity';

@Injectable()
export class AuthTokenRepository {
    constructor(
        @InjectRepository(AuthToken)
        private readonly authTokenRepository: Repository<AuthToken>
    ) {}

    async save(entity: AuthToken): Promise<AuthToken> {
        return this.authTokenRepository.save(entity);
    }

    async existsValid(type: AuthTokenType, token: string): Promise<boolean> {
        const count = await this.authTokenRepository.count({
            where: { type, token, expiresAt: MoreThan(new Date()) },
        });
        return count > 0;
    }

    async deleteByToken(type: AuthTokenType, token: string): Promise<void> {
        await this.authTokenRepository.delete({ type, token });
    }
}
