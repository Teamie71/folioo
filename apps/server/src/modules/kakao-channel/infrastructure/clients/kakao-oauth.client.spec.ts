import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { KakaoOAuthClient } from './kakao-oauth.client';

describe('KakaoOAuthClient', () => {
    const http = { post: jest.fn(), get: jest.fn() };
    const config = new ConfigService({
        KAKAO_CLIENT_ID: 'client',
        KAKAO_CLIENT_SECRET: 'secret',
        KAKAO_LINK_CALLBACK_URL: 'https://api.test/link/callback',
    });
    const client = new KakaoOAuthClient(http as unknown as HttpService, config);

    beforeEach(() => {
        jest.resetAllMocks();
        http.post.mockReturnValue(of({ data: { access_token: 'oauth-access' } }));
        http.get.mockReturnValue(of({ data: { id: 123 } }));
    });

    it('인가 URL은 연결 전용 callback과 state를 사용한다', () => {
        const url = new URL(client.buildAuthorizeUrl('signed-state'));
        expect(url.origin + url.pathname).toBe('https://kauth.kakao.com/oauth/authorize');
        expect(Object.fromEntries(url.searchParams)).toEqual({
            client_id: 'client',
            redirect_uri: 'https://api.test/link/callback',
            response_type: 'code',
            state: 'signed-state',
        });
    });

    it('폼으로 code를 교환하고 Bearer 토큰으로 사용자 ID를 조회한다', async () => {
        expect(await client.fetchKakaoUserId('code +/&')).toBe('123');
        const [url, form, options] = http.post.mock.calls[0] as [string, string, unknown];
        expect(url).toBe('https://kauth.kakao.com/oauth/token');
        expect(Object.fromEntries(new URLSearchParams(form))).toEqual({
            grant_type: 'authorization_code',
            client_id: 'client',
            client_secret: 'secret',
            redirect_uri: 'https://api.test/link/callback',
            code: 'code +/&',
        });
        expect(options).toMatchObject({
            timeout: 5000,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        });
        expect(http.get).toHaveBeenCalledWith('https://kapi.kakao.com/v2/user/me', {
            headers: { Authorization: 'Bearer oauth-access' },
            timeout: 5000,
        });
    });

    it('비밀키 미설정 시 client_secret을 보내지 않는다', async () => {
        const withoutSecret = new KakaoOAuthClient(
            http as unknown as HttpService,
            new ConfigService({
                KAKAO_CLIENT_ID: 'client',
                KAKAO_CLIENT_SECRET: '',
                KAKAO_LINK_CALLBACK_URL: 'https://api.test/callback',
            })
        );
        await withoutSecret.fetchKakaoUserId('code');
        const [, form] = http.post.mock.calls[0] as [string, string];
        expect(new URLSearchParams(form).has('client_secret')).toBe(false);
    });

    it.each([null, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, 'bad', '0'])(
        '잘못된 카카오 ID %p를 거부한다',
        async (id) => {
            http.get.mockReturnValue(of({ data: { id } }));
            await expect(client.fetchKakaoUserId('code')).rejects.toThrow();
        }
    );

    it('문자열로 받은 큰 ID는 손실 없이 보존한다', async () => {
        http.get.mockReturnValue(of({ data: { id: '9007199254740993' } }));
        expect(await client.fetchKakaoUserId('code')).toBe('9007199254740993');
    });

    it('토큰 교환 실패·빈 액세스 토큰은 사용자 조회를 하지 않는다', async () => {
        http.post.mockReturnValue(throwError(() => new Error('OAuth error')));
        await expect(client.fetchKakaoUserId('code')).rejects.toThrow();
        http.post.mockReturnValue(of({ data: { access_token: '' } }));
        await expect(client.fetchKakaoUserId('code')).rejects.toThrow();
        expect(http.get).not.toHaveBeenCalled();
    });
});
