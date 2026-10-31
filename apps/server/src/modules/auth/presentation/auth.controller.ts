import { Controller, Get, Headers, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonMessageResponse,
} from 'src/common/decorators/swagger.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { AuthGuard } from '@nestjs/passport';
import { SocialUser } from 'src/common/decorators/social-user.decorator';
import type { SocialUserAfterOAuth, UserAfterAuth } from '../domain/types/jwt-payload.type';
import type { Request, Response } from 'express';
import { LoginUsecase } from '../application/usecases/login.usecase';
import { ConfigService } from '@nestjs/config';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtRefreshGuard } from '../infrastructure/guards/jwt-refresh.guard';
import { TokenService } from '../infrastructure/services/token.service';
import { User } from 'src/common/decorators/user.decorator';
import { StringValue } from 'ms';
import { TimeUtil } from 'src/common/utils/time.util';
import { LogoutUsecase } from '../application/usecases/logout.usecase';
import { extractAccessTokenFromAuthorization } from '../infrastructure/utils/access-token.util';
import { parseFrontProfileState } from '../infrastructure/utils/oauth-state.util';
import { KakaoAuthGuard } from '../infrastructure/guards/kakao-auth.guard';
import { GoogleAuthGuard } from '../infrastructure/guards/google-auth.guard';
import { NaverAuthGuard } from '../infrastructure/guards/naver-auth.guard';
import { AllowPending } from 'src/common/decorators/allow-pending.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly configService: ConfigService,
        private readonly loginUsecase: LoginUsecase,
        private readonly tokenService: TokenService,
        private readonly logoutUsecase: LogoutUsecase
    ) {}

    @Get('kakao')
    @Public()
    @UseGuards(KakaoAuthGuard)
    @ApiOperation({
        summary: '카카오 로그인 트리거',
        description: '카카오 인증페이지로 리다이렉트합니다. 스웨거에서 누르지 마세요.',
    })
    @ApiQuery({
        name: 'redirect_url',
        description: '리다이렉트 될 base_url을 쿼리 파라미터로 포함합니다.',
        required: false,
    })
    @ApiQuery({
        name: 'redirect_path',
        description: '리다이렉트 될 uri path를 쿼리 파라미터로 포함합니다.',
        required: false,
    })
    @ApiQuery({
        name: 'state',
        description: '프론트 프로필(local/dev). prod 서버에서는 무시됩니다.',
        required: false,
    })
    @ApiResponse({
        status: 302,
        description: '카카오 로그인 페이지로 리다이렉트됨.',
    })
    async kakaoLogin() {}

    @Get('kakao/callback')
    @Public()
    @UseGuards(AuthGuard('kakao'))
    @ApiOperation({
        summary: '카카오 로그인 콜백',
        description:
            '로그인 로직이 이루어지고 프론트로 리다이렉트됩니다. 스웨거에서 누르지 마세요.',
    })
    @ApiResponse({
        status: 302,
        description: '프론트엔드 페이지로 리다이렉트됨',
    })
    async kakaoCallback(
        @SocialUser() user: SocialUserAfterOAuth,
        @Req() req: Request,
        @Res() res: Response
    ): Promise<void> {
        await this.handleSocialLoginRedirect(user, req, res);
    }

    @Get('google')
    @Public()
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({
        summary: '구글 로그인 트리거',
        description: '구글 인증페이지로 리다이렉트합니다. 스웨거에서 누르지 마세요.',
    })
    @ApiQuery({
        name: 'redirect_url',
        description: '리다이렉트 될 base_url을 쿼리 파라미터로 포함합니다.',
        required: false,
    })
    @ApiQuery({
        name: 'redirect_path',
        description: '리다이렉트 될 uri path를 쿼리 파라미터로 포함합니다.',
        required: false,
    })
    @ApiQuery({
        name: 'state',
        description: '프론트 프로필(local/dev). prod 서버에서는 무시됩니다.',
        required: false,
    })
    @ApiResponse({
        status: 302,
        description: '구글 로그인 페이지로 리다이렉트됨.',
    })
    async googleLogin() {}

    @Get('google/callback')
    @Public()
    @UseGuards(AuthGuard('google'))
    @ApiOperation({
        summary: '구글 로그인 콜백',
        description:
            '로그인 로직이 이루어지고 프론트로 리다이렉트됩니다. 스웨거에서 누르지 마세요.',
    })
    @ApiResponse({
        status: 302,
        description: '프론트엔드 페이지로 리다이렉트됨',
    })
    async googleCallback(
        @SocialUser() user: SocialUserAfterOAuth,
        @Req() req: Request,
        @Res() res: Response
    ): Promise<void> {
        await this.handleSocialLoginRedirect(user, req, res);
    }

    @Get('naver')
    @Public()
    @ApiOperation({
        summary: '네이버 로그인 트리거',
        description: '네이버 인증페이지로 리다이렉트합니다. 스웨거에서 누르지 마세요.',
    })
    @ApiQuery({
        name: 'redirect_url',
        description: '리다이렉트 될 base_url을 쿼리 파라미터로 포함합니다.',
        required: false,
    })
    @ApiQuery({
        name: 'redirect_path',
        description: '리다이렉트 될 uri path를 쿼리 파라미터로 포함합니다.',
        required: false,
    })
    @ApiQuery({
        name: 'state',
        description: '프론트 프로필(local/dev). prod 서버에서는 무시됩니다.',
        required: false,
    })
    @ApiResponse({
        status: 302,
        description: '네이버 로그인 페이지로 리다이렉트됨.',
    })
    @UseGuards(NaverAuthGuard)
    async naverLogin() {}

    @Get('naver/callback')
    @Public()
    @UseGuards(AuthGuard('naver'))
    @ApiOperation({
        summary: '네이버 로그인 콜백',
        description:
            '로그인 로직이 이루어지고 프론트로 리다이렉트됩니다. 스웨거에서 누르지 마세요.',
    })
    @ApiResponse({
        status: 302,
        description: '프론트엔드 페이지로 리다이렉트됨',
    })
    async naverCallback(
        @SocialUser() user: SocialUserAfterOAuth,
        @Req() req: Request,
        @Res() res: Response
    ): Promise<void> {
        await this.handleSocialLoginRedirect(user, req, res);
    }

    private async handleSocialLoginRedirect(
        user: SocialUserAfterOAuth,
        req: Request,
        res: Response
    ): Promise<void> {
        const { refreshToken, isNewUser } = await this.loginUsecase.execute(user);
        const expiresIn = (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
            '14d') as StringValue;
        const isLocal = this.configService.get<string>('APP_PROFILE', 'local') === 'local';
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: !isLocal,
            sameSite: isLocal ? 'lax' : 'none',
            path: '/',
            maxAge: TimeUtil.toMs(expiresIn),
        });
        const clientUrl = this.resolveClientRedirectUri(req);
        res.redirect(`${clientUrl}?status=success&isNewUser=${isNewUser}`);
    }

    private resolveClientRedirectUri(req: Request): string {
        const defaultRedirectUri = this.configService.getOrThrow<string>('CLIENT_REDIRECT_URI');
        const appProfile = this.configService.get<string>('APP_PROFILE', 'local');
        if (appProfile === 'prod') {
            return defaultRedirectUri;
        }

        const profileState = parseFrontProfileState(req.query?.state);
        if (!profileState) {
            return defaultRedirectUri;
        }

        const stateRedirectUri =
            profileState === 'local'
                ? this.configService.get<string>('CLIENT_REDIRECT_URI_LOCAL')
                : this.configService.get<string>('CLIENT_REDIRECT_URI_DEV');

        return stateRedirectUri ?? defaultRedirectUri;
    }

    @Post('refresh')
    @Public()
    @UseGuards(JwtRefreshGuard)
    @ApiOperation({
        summary: '토큰 재발급',
        description: '유효한 refreshToken을 사용해 accessToken을 발급 받습니다.',
    })
    @ApiCommonMessageResponse('new AccessToken', { status: HttpStatus.CREATED })
    @ApiCommonErrorResponse(
        ErrorCode.REFRESH_TOKEN_EXPIRED,
        ErrorCode.REFRESH_TOKEN_MISSING,
        ErrorCode.INVALID_REFRESH_TOKEN,
        ErrorCode.DEACTIVATED_USER
    )
    async handleRefresh(@User() user: UserAfterAuth) {
        const accessToken = await this.tokenService.generateAccessToken({
            sub: user.sub,
        });
        return accessToken;
    }

    @Post('logout')
    @AllowPending()
    @ApiOperation({
        summary: '로그아웃',
        description: 'JWT 토큰을 만료시키고 서버에서 로그아웃을 수행합니다.',
    })
    @ApiCommonMessageResponse('Logout from Server')
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async handleLogout(
        @Headers('authorization') authorization: string | undefined,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ): Promise<string> {
        const refreshToken = req.cookies?.refreshToken as string | undefined;
        const accessToken = extractAccessTokenFromAuthorization(authorization);

        if (!accessToken) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        await this.logoutUsecase.execute({
            accessToken,
            refreshToken: refreshToken ?? null,
        });

        const isLocal = this.configService.get<string>('APP_PROFILE', 'local') === 'local';
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: !isLocal,
            sameSite: isLocal ? 'lax' : 'none',
            path: '/',
        });

        return 'Logout from Server';
    }
}
