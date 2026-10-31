import { JwtService } from '@nestjs/jwt';
import { KakaoLinkTokenService } from './kakao-link-token.service';

describe('KakaoLinkTokenService', () => {
    const jwt = new JwtService({ secret: 'link-only-test-secret' });
    const service = new KakaoLinkTokenService(jwt);

    it('state는 사용자와 목적을 담고 10분 만료되며 매번 다르다', () => {
        const token = service.signState(1);
        const payload = jwt.verify<{ uid: number; purpose: string; exp: number; iat: number }>(
            token
        );
        expect(payload.uid).toBe(1);
        expect(payload.purpose).toBe('kakao-link-state');
        expect(payload.exp - payload.iat).toBe(600);
        expect(service.verifyState(token)).toEqual({ uid: 1 });
        expect(service.signState(1)).not.toBe(token);
    });

    it('연결 토큰은 카카오 ID를 담고 5분 만료된다', () => {
        const token = service.signLinkToken(1, '9007199254740993');
        const payload = jwt.verify<{ exp: number; iat: number }>(token);
        expect(payload.exp - payload.iat).toBe(300);
        expect(service.verifyLinkToken(token)).toEqual({ uid: 1, kid: '9007199254740993' });
    });

    it('state와 연결 토큰을 서로 바꿔 사용할 수 없다', () => {
        expect(() => service.verifyLinkToken(service.signState(1))).toThrow();
        expect(() => service.verifyState(service.signLinkToken(1, '123'))).toThrow();
    });

    it.each([
        { uid: 1, kid: '123', purpose: 'kakao-link', expiresIn: -1 },
        { uid: '1', kid: '123', purpose: 'kakao-link', expiresIn: 300 },
        { uid: 0, kid: '123', purpose: 'kakao-link', expiresIn: 300 },
        { uid: 2147483648, kid: '123', purpose: 'kakao-link', expiresIn: 300 },
        { uid: 1, kid: 123, purpose: 'kakao-link', expiresIn: 300 },
        { uid: 1, kid: '0', purpose: 'kakao-link', expiresIn: 300 },
        { uid: 1, kid: 'abc', purpose: 'kakao-link', expiresIn: 300 },
    ])('만료·잘못된 사용자·카카오 ID는 거부한다: %j', ({ expiresIn, ...payload }) => {
        expect(() => service.verifyLinkToken(jwt.sign(payload, { expiresIn }))).toThrow();
    });

    it('만료 정보 없는 토큰과 로그인 비밀키로 서명된 토큰은 거부한다', () => {
        expect(() =>
            service.verifyState(jwt.sign({ uid: 1, purpose: 'kakao-link-state' }))
        ).toThrow();
        const loginJwt = new JwtService({ secret: 'login-secret' });
        expect(() =>
            service.verifyLinkToken(
                loginJwt.sign({ uid: 1, kid: '123', purpose: 'kakao-link' }, { expiresIn: 300 })
            )
        ).toThrow();
    });
});
