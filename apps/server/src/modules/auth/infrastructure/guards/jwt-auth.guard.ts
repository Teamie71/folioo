import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { ALLOW_PENDING_KEY } from 'src/common/decorators/allow-pending.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { UserAfterAuth } from 'src/modules/auth/domain/types/jwt-payload.type';
import { UserService } from 'src/modules/user/application/services/user.service';
import { AuthTokenStoreService } from '../services/auth-token-store.service';
import { extractAccessTokenFromAuthorization } from '../utils/access-token.util';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(
        private readonly reflector: Reflector,
        private readonly authTokenStoreService: AuthTokenStoreService,
        private readonly userService: UserService
    ) {
        super();
    }

    handleRequest<TUser = UserAfterAuth>(
        err: unknown,
        user: TUser,
        _info: unknown,
        _context: ExecutionContext,
        _status?: unknown
    ): TUser {
        void _info;
        void _context;
        void _status;

        if (err) {
            if (err instanceof Error) {
                throw err;
            }
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        if (!user) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        return user;
    }

    private extractAccessToken(context: ExecutionContext): string | null {
        const request = context
            .switchToHttp()
            .getRequest<{ headers?: { authorization?: string } }>();
        const authorization = request.headers?.authorization;
        return extractAccessTokenFromAuthorization(authorization);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        const canActivate = (await super.canActivate(context)) as boolean;
        if (!canActivate) {
            return false;
        }

        const accessToken = this.extractAccessToken(context);
        if (accessToken) {
            const isBlacklisted =
                await this.authTokenStoreService.isAccessTokenBlacklisted(accessToken);
            if (isBlacklisted) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED);
            }
        }

        const request = context.switchToHttp().getRequest<{ user?: UserAfterAuth }>();
        const userId = request.user?.sub;
        if (!userId) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        const allowPending = this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        await this.userService.checkUserActive(userId, allowPending);

        return true;
    }
}
