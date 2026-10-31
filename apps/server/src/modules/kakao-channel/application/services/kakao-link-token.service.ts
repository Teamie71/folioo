import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

export const KAKAO_LINK_STATE_TTL_SECONDS = 600;
export const KAKAO_LINK_TOKEN_TTL_SECONDS = 300;

export interface KakaoLinkState {
    uid: number;
}
export interface KakaoLinkToken extends KakaoLinkState {
    kid: string;
}

@Injectable()
export class KakaoLinkTokenService {
    constructor(private readonly jwtService: JwtService) {}

    signState(userId: number): string {
        return this.jwtService.sign(
            { uid: userId, purpose: 'kakao-link-state', jti: randomUUID() },
            { algorithm: 'HS256', expiresIn: KAKAO_LINK_STATE_TTL_SECONDS }
        );
    }

    verifyState(token: string): KakaoLinkState {
        const payload = this.verify(token, 'kakao-link-state');
        return { uid: payload.uid as number };
    }

    signLinkToken(userId: number, kakaoAppUserId: string): string {
        return this.jwtService.sign(
            { uid: userId, kid: kakaoAppUserId, purpose: 'kakao-link' },
            { algorithm: 'HS256', expiresIn: KAKAO_LINK_TOKEN_TTL_SECONDS }
        );
    }

    verifyLinkToken(token: string): KakaoLinkToken {
        const payload = this.verify(token, 'kakao-link');
        if (typeof payload.kid !== 'string' || !/^[1-9]\d{0,63}$/.test(payload.kid)) {
            throw new BusinessException(ErrorCode.KAKAO_LINK_TOKEN_INVALID);
        }
        return { uid: payload.uid as number, kid: payload.kid };
    }

    private verify(token: string, purpose: string): Record<string, unknown> {
        try {
            const payload = this.jwtService.verify<Record<string, unknown>>(token, {
                algorithms: ['HS256'],
            });
            if (
                payload.purpose !== purpose ||
                !Number.isInteger(payload.uid) ||
                Number(payload.uid) <= 0 ||
                Number(payload.uid) > 2147483647 ||
                typeof payload.exp !== 'number'
            ) {
                throw new BusinessException(ErrorCode.KAKAO_LINK_TOKEN_INVALID);
            }
            return payload;
        } catch {
            throw new BusinessException(ErrorCode.KAKAO_LINK_TOKEN_INVALID);
        }
    }
}
