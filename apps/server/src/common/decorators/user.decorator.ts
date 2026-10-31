import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserAfterAuth } from 'src/modules/auth/domain/types/jwt-payload.type';

export const User = createParamDecorator((data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: UserAfterAuth }>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return data ? request.user?.[data] : request.user;
});
