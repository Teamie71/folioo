import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SocialUserAfterOAuth } from 'src/modules/auth/domain/types/jwt-payload.type';

export const SocialUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: SocialUserAfterOAuth }>();
    return request.user;
});
