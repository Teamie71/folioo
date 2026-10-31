import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-naver-v2';
import { LoginType } from 'src/modules/user/domain/enums/login-type.enum';
import { SocialUserAfterOAuth } from '../../domain/types/jwt-payload.type';
import {
    getOptionalSocialProfileField,
    requireSocialProfileField,
} from './social-profile-validation.util';

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
    constructor(private readonly configService: ConfigService) {
        super({
            clientID: configService.getOrThrow('NAVER_CLIENT_ID'),
            clientSecret: configService.getOrThrow('NAVER_CLIENT_SECRET'),
            callbackURL: configService.getOrThrow('NAVER_CALLBACK_URL'),
        });
    }

    validate(_accessToken: string, refreshToken: string, profile: Profile): SocialUserAfterOAuth {
        const normalizedRefreshToken = getOptionalSocialProfileField(refreshToken);
        const user: SocialUserAfterOAuth = {
            id: requireSocialProfileField(profile.id, 'id', LoginType.NAVER),
            nickname:
                getOptionalSocialProfileField(profile.nickname) ||
                getOptionalSocialProfileField(profile.name),
            email: getOptionalSocialProfileField(profile.email),
            socialType: LoginType.NAVER,
            refreshToken: normalizedRefreshToken || undefined,
        };
        return user;
    }
}
