import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

const OAUTH_TIMEOUT_MS = 5000;

// 챗봇 계정 연결 전용. 기존 passport-kakao 로그인 전략과 토큰 저장 흐름은 사용하지 않는다.
// https://developers.kakao.com/docs/ko/kakaologin/rest-api
@Injectable()
export class KakaoOAuthClient {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {}

    buildAuthorizeUrl(state: string): string {
        const url = new URL('https://kauth.kakao.com/oauth/authorize');
        url.searchParams.set('client_id', this.configService.getOrThrow<string>('KAKAO_CLIENT_ID'));
        url.searchParams.set(
            'redirect_uri',
            this.configService.getOrThrow<string>('KAKAO_LINK_CALLBACK_URL')
        );
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('state', state);
        return url.toString();
    }

    async fetchKakaoUserId(code: string): Promise<string> {
        const form = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: this.configService.getOrThrow<string>('KAKAO_CLIENT_ID'),
            redirect_uri: this.configService.getOrThrow<string>('KAKAO_LINK_CALLBACK_URL'),
            code,
        });
        const clientSecret = this.configService.get<string>('KAKAO_CLIENT_SECRET');
        if (clientSecret) form.set('client_secret', clientSecret);
        const tokenResponse = await firstValueFrom(
            this.httpService.post<{ access_token?: unknown }>(
                'https://kauth.kakao.com/oauth/token',
                form.toString(),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
                    timeout: OAUTH_TIMEOUT_MS,
                }
            )
        );
        const accessToken = tokenResponse.data.access_token;
        if (typeof accessToken !== 'string' || !accessToken) {
            throw new BusinessException(ErrorCode.INVALID_SOCIAL_PROFILE);
        }
        const userResponse = await firstValueFrom(
            this.httpService.get<{ id?: unknown }>('https://kapi.kakao.com/v2/user/me', {
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: OAUTH_TIMEOUT_MS,
            })
        );
        const id = userResponse.data.id;
        if (typeof id === 'number' && Number.isSafeInteger(id) && id > 0) return String(id);
        if (typeof id === 'string' && /^[1-9]\d{0,63}$/.test(id)) return id;
        throw new BusinessException(ErrorCode.INVALID_SOCIAL_PROFILE);
    }
}
