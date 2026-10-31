import { LoginType } from 'src/modules/user/domain/enums/login-type.enum';

export interface JwtPayload {
    sub: number;
}

export interface SocialUserAfterOAuth {
    id: string;
    nickname: string;
    email: string;
    socialType: LoginType;
    refreshToken?: string;
}

export type UserAfterAuth = JwtPayload & {
    refreshToken?: string;
};
