jest.mock('@sentry/nestjs', () => ({ setUser: jest.fn() }));
import * as Sentry from '@sentry/nestjs';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { UserService } from 'src/modules/user/application/services/user.service';
import { AuthTokenStoreService } from '../services/auth-token-store.service';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeContext(user?: { sub: number }): ExecutionContext {
    const request = { headers: { authorization: 'Bearer access-token' }, user };
    return {
        getHandler: () => undefined,
        getClass: () => undefined,
        switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
}

describe('JwtAuthGuard Sentry 사용자 정보', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    const tokenStore = { isAccessTokenBlacklisted: jest.fn().mockResolvedValue(false) };
    const userService = { checkUserActive: jest.fn().mockResolvedValue(undefined) };
    const guard = new JwtAuthGuard(
        reflector as unknown as Reflector,
        tokenStore as unknown as AuthTokenStoreService,
        userService as unknown as UserService
    );

    beforeEach(() => {
        jest.clearAllMocks();
        reflector.getAllAndOverride.mockReturnValue(false);
        // passport JWT 검증(super.canActivate)은 통과했다고 가정한다.
        jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate').mockResolvedValue(
            true
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('인증된 사용자면 Sentry에 사용자 ID만 넣는다', async () => {
        await expect(guard.canActivate(makeContext({ sub: 42 }))).resolves.toBe(true);

        expect(Sentry.setUser).toHaveBeenCalledWith({ id: '42' });
    });

    it('비활성 사용자로 막히면 사용자를 넣지 않는다', async () => {
        userService.checkUserActive.mockRejectedValueOnce(
            new BusinessException(ErrorCode.UNAUTHORIZED)
        );

        await expect(guard.canActivate(makeContext({ sub: 42 }))).rejects.toBeInstanceOf(
            BusinessException
        );
        expect(Sentry.setUser).not.toHaveBeenCalled();
    });

    it('블랙리스트 토큰이면 사용자를 넣지 않는다', async () => {
        tokenStore.isAccessTokenBlacklisted.mockResolvedValueOnce(true);

        await expect(guard.canActivate(makeContext({ sub: 42 }))).rejects.toBeInstanceOf(
            BusinessException
        );
        expect(Sentry.setUser).not.toHaveBeenCalled();
    });

    it('@Public() API는 사용자를 넣지 않는다', async () => {
        reflector.getAllAndOverride.mockReturnValue(true);

        await expect(guard.canActivate(makeContext())).resolves.toBe(true);
        expect(Sentry.setUser).not.toHaveBeenCalled();
    });
});
