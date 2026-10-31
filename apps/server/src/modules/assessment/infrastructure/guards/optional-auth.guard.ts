import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { extractAccessTokenFromAuthorization } from 'src/modules/auth/infrastructure/utils/access-token.util';
import { JwtPayload, UserAfterAuth } from 'src/modules/auth/domain/types/jwt-payload.type';

interface RequestWithOptionalUser {
    headers?: { authorization?: string };
    user?: UserAfterAuth;
}

// @Public() 라우트에서 로그인 여부에 따라 응답(마스킹)을 바꾸고 싶을 때만 쓴다.
// 토큰이 없거나 유효하지 않아도 절대 막지 않고 비로그인으로 취급한다.
@Injectable()
export class OptionalAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<RequestWithOptionalUser>();
        const token = extractAccessTokenFromAuthorization(request.headers?.authorization);
        if (!token) {
            return true;
        }

        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
            request.user = { sub: payload.sub };
        } catch {
            // 유효하지 않은 토큰은 비로그인으로 취급할 뿐 막지 않는다.
        }

        return true;
    }
}
