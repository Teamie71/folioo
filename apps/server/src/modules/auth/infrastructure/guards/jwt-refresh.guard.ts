import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { UserAfterAuth } from 'src/modules/auth/domain/types/jwt-payload.type';
import { UserService } from 'src/modules/user/application/services/user.service';
import { AuthTokenStoreService } from '../services/auth-token-store.service';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
    constructor(
        private readonly authTokenStoreService: AuthTokenStoreService,
        private readonly userService: UserService
    ) {
        super();
    }

    handleRequest<TUser = UserAfterAuth>(
        err: unknown,
        user: TUser,
        info: unknown,
        _context: ExecutionContext,
        _status?: unknown
    ): TUser {
        void _context;
        void _status;

        const errorInfo = info instanceof Error ? info : undefined;

        if (err || !user) {
            // Case A: 토큰 만료
            if (errorInfo?.name === 'TokenExpiredError') {
                throw new BusinessException(ErrorCode.REFRESH_TOKEN_EXPIRED);
            }

            // Case B: 토큰 없음 (쿠키에 없음)
            if (errorInfo?.message === 'No auth token') {
                throw new BusinessException(ErrorCode.REFRESH_TOKEN_MISSING);
            }

            // Case C: 서명 불일치, 형식 오류 등 기타 (JsonWebTokenError)
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        return user;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const canActivate = (await super.canActivate(context)) as boolean;
        if (!canActivate) {
            return false;
        }

        const request = context.switchToHttp().getRequest<{ user?: UserAfterAuth }>();
        const refreshToken = request.user?.refreshToken;
        const userId = request.user?.sub;

        if (!refreshToken) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_MISSING);
        }

        if (!userId) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        const isWhitelisted =
            await this.authTokenStoreService.isRefreshTokenWhitelisted(refreshToken);
        if (!isWhitelisted) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        await this.userService.checkUserActive(userId, true);

        return true;
    }
}
