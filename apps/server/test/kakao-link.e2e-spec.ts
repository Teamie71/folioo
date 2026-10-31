import { Test } from '@nestjs/testing';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD, HttpAdapterHost, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/modules/auth/infrastructure/strategies/jwt.strategy';
import { AuthTokenStoreService } from '../src/modules/auth/infrastructure/services/auth-token-store.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { UserService } from '../src/modules/user/application/services/user.service';
import { User } from '../src/modules/user/domain/user.entity';
import { UserStatus } from '../src/modules/user/domain/enums/user-status.enum';
import { BusinessException } from '../src/common/exceptions/business.exception';
import { ErrorCode } from '../src/common/exceptions/error-code.enum';
import { KakaoChannelLinkService } from '../src/modules/kakao-channel/application/services/kakao-channel-link.service';
import { KakaoLinkTokenService } from '../src/modules/kakao-channel/application/services/kakao-link-token.service';
import { KakaoLinkFacade } from '../src/modules/kakao-channel/application/facades/kakao-link.facade';
import { KakaoOAuthClient } from '../src/modules/kakao-channel/infrastructure/clients/kakao-oauth.client';
import { KakaoLinkController } from '../src/modules/kakao-channel/presentation/kakao-link.controller';
import { KakaoChannelLink } from '../src/modules/kakao-channel/domain/kakao-channel-link.entity';

// HTTP 계약은 실제 JWT·검증 파이프를 사용한다. 트랜잭션은 별도 PostgreSQL 테스트로 검증한다.
jest.mock('typeorm-transactional', () => ({
    Transactional: () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
        descriptor,
}));

describe('Kakao linking HTTP contract', () => {
    let app: INestApplication;
    let errorLog: jest.SpyInstance;
    type ApiBody = {
        result: { authorize_url: string; linked: boolean };
        error: { errorCode: string };
    };
    const linkJwt = new JwtService({ secret: 'link-secret' });
    const loginJwt = new JwtService({ secret: 'login-secret' });
    const tokens = new KakaoLinkTokenService(linkJwt);
    const users = {
        checkUserActive: jest.fn(),
        findByKakaoLoginId: jest.fn(),
        findByIdOrThrow: jest.fn(),
        findKakaoLoginIdByUserId: jest.fn(),
    };
    const links = {
        findByUserId: jest.fn(),
        findByKakaoAppUserId: jest.fn(),
        unlink: jest.fn(),
        linkOrThrow: jest.fn(),
    };
    const oauth = {
        buildAuthorizeUrl: (state: string) =>
            `https://kauth.kakao.com/oauth/authorize?state=${state}`,
        fetchKakaoUserId: jest.fn(),
    };
    const store = { isAccessTokenBlacklisted: jest.fn() };
    const activeUser = Object.assign(new User(), {
        id: 2,
        isActive: true,
        status: UserStatus.ACTIVE,
    });

    beforeAll(async () => {
        errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        const module = await Test.createTestingModule({
            imports: [PassportModule],
            controllers: [KakaoLinkController],
            providers: [
                KakaoLinkFacade,
                JwtStrategy,
                {
                    provide: ConfigService,
                    useValue: new ConfigService({
                        JWT_SECRET_TOKEN: 'login-secret',
                        KAKAO_LINK_RESULT_URL: 'https://web.test/result?keep=1',
                    }),
                },
                { provide: UserService, useValue: users },
                { provide: KakaoChannelLinkService, useValue: links },
                { provide: KakaoLinkTokenService, useValue: tokens },
                { provide: KakaoOAuthClient, useValue: oauth },
                { provide: AuthTokenStoreService, useValue: store },
                { provide: APP_GUARD, useClass: JwtAuthGuard },
            ],
        }).compile();
        app = module.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
        );
        app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));
        app.useGlobalFilters(new GlobalExceptionFilter(app.get(HttpAdapterHost)));
        await app.init();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        users.checkUserActive.mockReset().mockResolvedValue(undefined);
        users.findByKakaoLoginId.mockReset().mockResolvedValue(null);
        users.findKakaoLoginIdByUserId.mockReset().mockResolvedValue(null);
        users.findByIdOrThrow.mockReset().mockResolvedValue(activeUser);
        links.findByUserId.mockReset().mockResolvedValue(null);
        links.findByKakaoAppUserId.mockReset().mockResolvedValue(null);
        links.unlink.mockReset().mockResolvedValue(undefined);
        links.linkOrThrow.mockReset().mockResolvedValue(undefined);
        oauth.fetchKakaoUserId.mockReset().mockResolvedValue('123');
        store.isAccessTokenBlacklisted.mockReset().mockResolvedValue(false);
    });
    afterAll(async () => {
        await app.close();
        jest.restoreAllMocks();
    });
    const bearer = () => `Bearer ${loginJwt.sign({ sub: 1 }, { expiresIn: 300 })}`;
    const postLink = (token = tokens.signLinkToken(1, '123')) =>
        request(app.getHttpServer() as App)
            .post('/kakao-channel/link')
            .set('Authorization', bearer())
            .send({ link_token: token });
    const callback = (query: Record<string, string | undefined>) =>
        request(app.getHttpServer() as App)
            .get('/kakao-channel/link/callback')
            .query(query);

    it.each([
        ['post', '/authorize'],
        ['post', ''],
        ['get', '/status'],
    ] as const)('%s %s는 JWT를 요구한다', async (method, path) => {
        await request(app.getHttpServer() as App)
            [method](`/kakao-channel/link${path}`)
            .expect(401);
    });
    it('블랙리스트·탈퇴·가입 미완료 사용자는 인가 URL을 발급할 수 없다', async () => {
        store.isAccessTokenBlacklisted.mockResolvedValue(true);
        await request(app.getHttpServer() as App)
            .post('/kakao-channel/link/authorize')
            .set('Authorization', bearer())
            .expect(401);
        store.isAccessTokenBlacklisted.mockResolvedValue(false);
        users.checkUserActive.mockRejectedValue(new BusinessException(ErrorCode.UNAUTHORIZED));
        await request(app.getHttpServer() as App)
            .post('/kakao-channel/link/authorize')
            .set('Authorization', bearer())
            .expect(401);
    });
    it('AC-3-1: 인증 사용자로 state를 발급한다', async () => {
        const res = await request(app.getHttpServer() as App)
            .post('/kakao-channel/link/authorize')
            .set('Authorization', bearer())
            .expect(200);
        const url = new URL((res.body as ApiBody).result.authorize_url);
        expect(tokens.verifyState(url.searchParams.get('state')!)).toEqual({ uid: 1 });
        expect(users.checkUserActive).toHaveBeenCalledWith(1, undefined);
    });
    it('AC-3-2: JWT 없는 callback은 연결 토큰으로 리다이렉트하고 저장하지 않는다', async () => {
        const res = await callback({
            state: tokens.signState(1),
            code: 'auth-code',
            extra: 'allowed',
        }).expect(302);
        const url = new URL(res.headers.location);
        expect(url.origin + url.pathname).toBe('https://web.test/result');
        expect(url.searchParams.get('keep')).toBe('1');
        expect(tokens.verifyLinkToken(url.searchParams.get('link_token')!)).toEqual({
            uid: 1,
            kid: '123',
        });
        expect(links.linkOrThrow).not.toHaveBeenCalled();
        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.headers['referrer-policy']).toBe('no-referrer');
    });
    it('AC-3-3: 사용자 동의 취소는 CANCELED이며 OAuth 호출이 없다', async () => {
        const res = await callback({
            state: tokens.signState(1),
            error: 'access_denied',
            error_description: 'denied',
        }).expect(302);
        expect(new URL(res.headers.location).searchParams.get('error')).toBe('CANCELED');
        expect(oauth.fetchKakaoUserId).not.toHaveBeenCalled();
    });
    it.each([
        '',
        'tampered',
        linkJwt.sign({ uid: 1, purpose: 'kakao-link-state' }, { expiresIn: -1 }),
        tokens.signLinkToken(1, '123'),
    ])('AC-3-4: 누락·변조·만료·다른 목적 state는 INVALID_STATE', async (state) => {
        const res = await callback({ state, code: 'code' }).expect(302);
        expect(new URL(res.headers.location).searchParams.get('error')).toBe('INVALID_STATE');
        expect(oauth.fetchKakaoUserId).not.toHaveBeenCalled();
    });
    it('AC-3-5: OAuth 장애는 FAILED로 리다이렉트한다', async () => {
        oauth.fetchKakaoUserId.mockRejectedValue(new Error('sensitive code/access_token'));
        const res = await callback({ state: tokens.signState(1), code: 'code' }).expect(302);
        expect(new URL(res.headers.location).searchParams.get('error')).toBe('FAILED');
        expect(links.linkOrThrow).not.toHaveBeenCalled();
        expect(errorLog).toHaveBeenCalledWith('Kakao linking callback failed');
    });
    it.each([{ error: 'server_error' }, {}])(
        'code 누락·카카오 오류는 FAILED이다',
        async (query) => {
            const res = await callback({ state: tokens.signState(1), ...query }).expect(302);
            expect(new URL(res.headers.location).searchParams.get('error')).toBe('FAILED');
            expect(oauth.fetchKakaoUserId).not.toHaveBeenCalled();
        }
    );
    it.each([
        tokens.signLinkToken(2, '123'),
        tokens.signState(1),
        linkJwt.sign({ uid: 1, kid: '123', purpose: 'kakao-link' }, { expiresIn: -1 }),
        'bad',
    ])('AC-3-6/7: 사용자 불일치·state·만료·변조 토큰은 KAKAO400', async (token) => {
        const res = await postLink(token).expect(400);
        expect((res.body as ApiBody).error.errorCode).toBe('KAKAO400');
        expect(links.findByUserId).not.toHaveBeenCalled();
    });
    it.each([{}, { link_token: '' }, { link_token: 123 }, { link_token: 'x', extra: true }])(
        '잘못된 연결 요청 본문은 검증 단계에서 거부한다',
        async (body) => {
            await request(app.getHttpServer() as App)
                .post('/kakao-channel/link')
                .set('Authorization', bearer())
                .send(body)
                .expect(400);
            expect(links.findByUserId).not.toHaveBeenCalled();
        }
    );
    it('AC-3-8: 다른 활성 사용자의 연결은 KAKAO409이다', async () => {
        links.findByKakaoAppUserId.mockResolvedValue(KakaoChannelLink.create(2, '123'));
        const res = await postLink().expect(409);
        expect((res.body as ApiBody).error.errorCode).toBe('KAKAO409');
        expect(links.unlink).not.toHaveBeenCalled();
    });
    it('AC-3-9: 연결 행 없는 다른 카카오 가입자의 계정도 KAKAO409이다', async () => {
        users.findByKakaoLoginId.mockResolvedValue(activeUser);
        const res = await postLink().expect(409);
        expect((res.body as ApiBody).error.errorCode).toBe('KAKAO409');
        expect(links.linkOrThrow).not.toHaveBeenCalled();
    });
    it('AC-3-10: 탈퇴자의 연결을 정리하고 새 사용자의 연결을 저장한다', async () => {
        links.findByKakaoAppUserId.mockResolvedValue(KakaoChannelLink.create(2, '123'));
        const inactive = Object.assign(new User(), { id: 2, isActive: false });
        users.findByIdOrThrow.mockResolvedValue(inactive);
        users.findByKakaoLoginId.mockResolvedValue(inactive);
        await postLink().expect(200);
        expect(links.unlink).toHaveBeenCalledWith(2);
        expect(links.linkOrThrow).toHaveBeenCalledWith(1, '123');
    });
    it('AC-3-11: 같은 계정 재연결은 저장·선택 초기화 없이 성공한다', async () => {
        links.findByUserId.mockResolvedValue(KakaoChannelLink.create(1, '123'));
        await postLink().expect(200);
        expect(links.linkOrThrow).not.toHaveBeenCalled();
        expect(links.unlink).not.toHaveBeenCalled();
    });
    it.each(['link', 'social'])(
        'AC-3-12: 기존 %s의 카카오 ID와 다르면 KAKAO4091이다',
        async (kind) => {
            if (kind === 'link')
                links.findByUserId.mockResolvedValue(KakaoChannelLink.create(1, '456'));
            else users.findKakaoLoginIdByUserId.mockResolvedValue('456');
            const res = await postLink().expect(409);
            expect((res.body as ApiBody).error.errorCode).toBe('KAKAO4091');
            expect(links.linkOrThrow).not.toHaveBeenCalled();
        }
    );
    it.each(['none', 'link', 'social'])('AC-3-13/14: %s 상태를 조회한다', async (kind) => {
        if (kind === 'link')
            links.findByUserId.mockResolvedValue(KakaoChannelLink.create(1, '123'));
        if (kind === 'social') users.findKakaoLoginIdByUserId.mockResolvedValue('123');
        const res = await request(app.getHttpServer() as App)
            .get('/kakao-channel/link/status')
            .set('Authorization', bearer())
            .expect(200);
        expect((res.body as ApiBody).result).toEqual({ linked: kind !== 'none' });
    });
});
