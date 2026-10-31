import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-kakao';
import { LoginType } from 'src/modules/user/domain/enums/login-type.enum';
import { SocialUserAfterOAuth } from '../../domain/types/jwt-payload.type';
import {
    getOptionalSocialProfileField,
    requireSocialProfileField,
} from './social-profile-validation.util';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        super({
            clientID: configService.getOrThrow('KAKAO_CLIENT_ID'),
            clientSecret: configService.getOrThrow('KAKAO_CLIENT_SECRET'),
            callbackURL: configService.getOrThrow('KAKAO_CALLBACK_URL'),
        });
    }

    validate(_accessToken: string, refreshToken: string, profile: Profile): SocialUserAfterOAuth {
        const raw = profile._json as unknown as KakaoRawData;
        const normalizedRefreshToken = getOptionalSocialProfileField(refreshToken);
        const user: SocialUserAfterOAuth = {
            id: requireSocialProfileField(raw.id, 'id', LoginType.KAKAO),
            nickname:
                getOptionalSocialProfileField(raw.kakao_account?.profile?.nickname) ||
                getOptionalSocialProfileField(raw.properties?.nickname),
            email: getOptionalSocialProfileField(raw.kakao_account?.email),
            socialType: LoginType.KAKAO,
            refreshToken: normalizedRefreshToken || undefined,
        };
        return user;
    }
}

interface KakaoAccount {
    profile?: {
        nickname?: unknown;
    };
    email?: unknown;
}

interface KakaoRawData {
    id?: unknown;
    properties?: {
        nickname?: unknown;
    };
    kakao_account?: KakaoAccount;
}
