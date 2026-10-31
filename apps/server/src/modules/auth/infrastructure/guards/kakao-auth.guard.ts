import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { parseFrontProfileState } from '../utils/oauth-state.util';

@Injectable()
export class KakaoAuthGuard extends AuthGuard('kakao') {
    constructor(private readonly configService: ConfigService) {
        super();
    }

    getAuthenticateOptions(context: ExecutionContext): { state: string } | undefined {
        const appProfile = this.configService.get<string>('APP_PROFILE', 'local');
        if (appProfile === 'prod') {
            return undefined;
        }

        const request = context.switchToHttp().getRequest<{ query?: { state?: unknown } }>();
        const state = parseFrontProfileState(request.query?.state);
        if (!state) {
            return undefined;
        }

        return { state };
    }
}
