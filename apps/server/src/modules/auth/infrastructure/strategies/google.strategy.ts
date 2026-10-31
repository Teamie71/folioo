import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { LoginType } from 'src/modules/user/domain/enums/login-type.enum';
import { SocialUserAfterOAuth } from '../../domain/types/jwt-payload.type';
import {
    getOptionalSocialProfileField,
    requireSocialProfileField,
} from './social-profile-validation.util';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        super({
            clientID: configService.getOrThrow('GOOGLE_CLIENT_ID'),
            clientSecret: configService.getOrThrow('GOOGLE_CLIENT_SECRET'),
            callbackURL: configService.getOrThrow('GOOGLE_CALLBACK_URL'),
            scope: ['profile', 'email'],
        });
    }

    authorizationParams(): Record<string, string> {
        return {
            access_type: 'offline',
            prompt: 'consent',
        };
    }

    validate(_accessToken: string, refreshToken: string, profile: Profile): SocialUserAfterOAuth {
        const email = getOptionalSocialProfileField(profile.emails?.[0]?.value);
        const nickname =
            getOptionalSocialProfileField(profile.displayName) ||
            getOptionalSocialProfileField(profile.name?.givenName);
        const normalizedRefreshToken = getOptionalSocialProfileField(refreshToken);
        const user: SocialUserAfterOAuth = {
            id: requireSocialProfileField(profile.id, 'id', LoginType.GOOGLE),
            nickname,
            email,
            socialType: LoginType.GOOGLE,
            refreshToken: normalizedRefreshToken || undefined,
        };
        return user;
    }
}
