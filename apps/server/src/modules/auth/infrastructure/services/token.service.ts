import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/modules/user/domain/user.entity';
import { JwtPayload } from '../../domain/types/jwt-payload.type';
import { ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';

@Injectable()
export class TokenService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    async generateAccessToken(payload: JwtPayload): Promise<string> {
        return this.jwtService.signAsync(payload);
    }

    async generateRefreshToken(user: User): Promise<string> {
        const payload: JwtPayload = {
            sub: user.id,
        };

        return this.jwtService.signAsync(payload, {
            secret: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN'),
            expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
                '14d') as StringValue,
        });
    }
}
