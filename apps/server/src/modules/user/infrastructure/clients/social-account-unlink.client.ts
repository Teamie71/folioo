import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { LoginType } from '../../domain/enums/login-type.enum';
import { SocialUser } from '../../domain/social-user.entity';

const KAKAO_UNLINK_URL = 'https://kapi.kakao.com/v1/user/unlink';
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const NAVER_TOKEN_URL = 'https://nid.naver.com/oauth2.0/token';
const SOCIAL_UNLINK_TIMEOUT_MS = 10000;

interface RefreshAccessTokenOptions {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    requestFailureReason: string;
    responseReadFailureReason: string;
    httpErrorReason: string;
    apiErrorReason: string;
    missingAccessTokenReason: string;
}

@Injectable()
export class SocialAccountUnlinkClient {
    private readonly logger = new Logger(SocialAccountUnlinkClient.name);
    private readonly kakaoClientId: string;
    private readonly kakaoClientSecret: string;
    private readonly googleClientId: string;
    private readonly googleClientSecret: string;
    private readonly naverClientId: string;
    private readonly naverClientSecret: string;

    constructor(private readonly configService: ConfigService) {
        this.kakaoClientId = this.configService.getOrThrow<string>('KAKAO_CLIENT_ID');
        this.kakaoClientSecret = this.configService.getOrThrow<string>('KAKAO_CLIENT_SECRET');
        this.googleClientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
        this.googleClientSecret = this.configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET');
        this.naverClientId = this.configService.getOrThrow<string>('NAVER_CLIENT_ID');
        this.naverClientSecret = this.configService.getOrThrow<string>('NAVER_CLIENT_SECRET');
    }

    async unlinkSocialAccount(socialUser: SocialUser): Promise<void> {
        if (socialUser.loginType === LoginType.KAKAO) {
            await this.unlinkKakao(socialUser);
            return;
        }

        if (socialUser.loginType === LoginType.GOOGLE) {
            await this.unlinkGoogle(socialUser);
            return;
        }

        if (socialUser.loginType === LoginType.NAVER) {
            await this.unlinkNaver(socialUser);
            return;
        }

        throw this.unlinkFailure(socialUser, 'unsupported_social_provider');
    }

    private async unlinkKakao(socialUser: SocialUser): Promise<void> {
        const refreshToken = this.requireRefreshToken(socialUser, 'kakao_refresh_token_missing');
        const accessToken = await this.refreshKakaoAccessToken(socialUser, refreshToken);

        const response = await this.request(
            () =>
                fetch(KAKAO_UNLINK_URL, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
                    },
                    signal: AbortSignal.timeout(SOCIAL_UNLINK_TIMEOUT_MS),
                }),
            socialUser,
            'kakao_unlink_request_failed'
        );

        await this.ensureSuccessResponse(response, socialUser, 'kakao_unlink_failed');
    }

    private async unlinkGoogle(socialUser: SocialUser): Promise<void> {
        const refreshToken = this.requireRefreshToken(socialUser, 'google_refresh_token_missing');

        const body = new URLSearchParams({
            token: refreshToken,
            client_id: this.googleClientId,
            client_secret: this.googleClientSecret,
        });

        const response = await this.request(
            () =>
                fetch(GOOGLE_REVOKE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
                    },
                    body,
                    signal: AbortSignal.timeout(SOCIAL_UNLINK_TIMEOUT_MS),
                }),
            socialUser,
            'google_revoke_request_failed'
        );

        await this.ensureSuccessResponse(response, socialUser, 'google_revoke_failed');
    }

    private async unlinkNaver(socialUser: SocialUser): Promise<void> {
        const refreshToken = this.requireRefreshToken(socialUser, 'naver_refresh_token_missing');
        const accessToken = await this.refreshNaverAccessToken(socialUser, refreshToken);

        const body = new URLSearchParams({
            grant_type: 'delete',
            client_id: this.naverClientId,
            client_secret: this.naverClientSecret,
            access_token: accessToken,
            service_provider: 'NAVER',
        });

        const response = await this.request(
            () =>
                fetch(NAVER_TOKEN_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
                    },
                    body,
                    signal: AbortSignal.timeout(SOCIAL_UNLINK_TIMEOUT_MS),
                }),
            socialUser,
            'naver_delete_token_request_failed'
        );

        const bodyText = await this.readResponseText(
            response,
            socialUser,
            'naver_delete_token_response_read_failed'
        );

        if (!response.ok) {
            this.logProviderResponseError(
                socialUser,
                'naver_delete_token_http_error',
                response.status,
                bodyText
            );
            throw this.unlinkFailure(socialUser, 'naver_delete_token_http_error', {
                httpStatus: response.status,
            });
        }

        const parsed = this.parseJson(bodyText);
        if (parsed && typeof parsed.error === 'string') {
            this.logProviderApiError(socialUser, 'naver_delete_token_api_error', bodyText);
            throw this.unlinkFailure(socialUser, 'naver_delete_token_api_error');
        }
    }

    private async refreshKakaoAccessToken(
        socialUser: SocialUser,
        refreshToken: string
    ): Promise<string> {
        return this.refreshAccessToken(socialUser, refreshToken, {
            tokenUrl: KAKAO_TOKEN_URL,
            clientId: this.kakaoClientId,
            clientSecret: this.kakaoClientSecret,
            requestFailureReason: 'kakao_refresh_token_request_failed',
            responseReadFailureReason: 'kakao_refresh_token_response_read_failed',
            httpErrorReason: 'kakao_refresh_token_http_error',
            apiErrorReason: 'kakao_refresh_token_api_error',
            missingAccessTokenReason: 'kakao_refresh_token_missing_access_token',
        });
    }

    private async refreshNaverAccessToken(
        socialUser: SocialUser,
        refreshToken: string
    ): Promise<string> {
        return this.refreshAccessToken(socialUser, refreshToken, {
            tokenUrl: NAVER_TOKEN_URL,
            clientId: this.naverClientId,
            clientSecret: this.naverClientSecret,
            requestFailureReason: 'naver_refresh_token_request_failed',
            responseReadFailureReason: 'naver_refresh_token_response_read_failed',
            httpErrorReason: 'naver_refresh_token_http_error',
            apiErrorReason: 'naver_refresh_token_api_error',
            missingAccessTokenReason: 'naver_refresh_token_missing_access_token',
        });
    }

    private async refreshAccessToken(
        socialUser: SocialUser,
        refreshToken: string,
        options: RefreshAccessTokenOptions
    ): Promise<string> {
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: options.clientId,
            client_secret: options.clientSecret,
            refresh_token: refreshToken,
        });

        const response = await this.request(
            () =>
                fetch(options.tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
                    },
                    body,
                    signal: AbortSignal.timeout(SOCIAL_UNLINK_TIMEOUT_MS),
                }),
            socialUser,
            options.requestFailureReason
        );

        const bodyText = await this.readResponseText(
            response,
            socialUser,
            options.responseReadFailureReason
        );

        if (!response.ok) {
            this.logProviderResponseError(
                socialUser,
                options.httpErrorReason,
                response.status,
                bodyText
            );
            throw this.unlinkFailure(socialUser, options.httpErrorReason, {
                httpStatus: response.status,
            });
        }

        const parsed = this.parseJson(bodyText);
        if (parsed && typeof parsed.error === 'string') {
            this.logProviderApiError(socialUser, options.apiErrorReason, bodyText);
            throw this.unlinkFailure(socialUser, options.apiErrorReason);
        }

        const refreshedAccessToken = this.getStringValue(parsed, 'access_token');
        if (!refreshedAccessToken) {
            this.logProviderResponseError(
                socialUser,
                options.missingAccessTokenReason,
                response.status,
                bodyText
            );
            throw this.unlinkFailure(socialUser, options.missingAccessTokenReason);
        }

        return refreshedAccessToken;
    }

    private requireRefreshToken(socialUser: SocialUser, reason: string): string {
        if (!socialUser.oauthRefreshToken) {
            throw this.unlinkFailure(socialUser, reason);
        }

        return socialUser.oauthRefreshToken;
    }

    private async request(
        request: () => Promise<Response>,
        socialUser: SocialUser,
        reason: string
    ): Promise<Response> {
        try {
            return await request();
        } catch (error) {
            this.logger.error(
                `Social unlink request failed: provider=${socialUser.loginType}, userId=${socialUser.userId}, socialUserId=${socialUser.id}, reason=${reason}, error=${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined
            );
            throw this.unlinkFailure(socialUser, reason);
        }
    }

    private async ensureSuccessResponse(
        response: Response,
        socialUser: SocialUser,
        reason: string
    ): Promise<void> {
        if (response.ok) {
            return;
        }

        const bodyText = await this.readResponseText(
            response,
            socialUser,
            `${reason}_response_read_failed`
        );

        this.logProviderResponseError(socialUser, reason, response.status, bodyText);

        throw this.unlinkFailure(socialUser, reason, {
            httpStatus: response.status,
        });
    }

    private logProviderResponseError(
        socialUser: SocialUser,
        reason: string,
        httpStatus: number,
        responseBody: string
    ): void {
        this.logger.error(
            `Social unlink provider response error: provider=${socialUser.loginType}, userId=${socialUser.userId}, socialUserId=${socialUser.id}, reason=${reason}, httpStatus=${httpStatus}, responseBody=${responseBody}`
        );
    }

    private logProviderApiError(
        socialUser: SocialUser,
        reason: string,
        responseBody: string
    ): void {
        this.logger.error(
            `Social unlink provider api error: provider=${socialUser.loginType}, userId=${socialUser.userId}, socialUserId=${socialUser.id}, reason=${reason}, responseBody=${responseBody}`
        );
    }

    private async readResponseText(
        response: Response,
        socialUser: SocialUser,
        reason: string
    ): Promise<string> {
        try {
            return await response.text();
        } catch (error) {
            this.logger.error(
                `Social unlink response read failed: provider=${socialUser.loginType}, userId=${socialUser.userId}, socialUserId=${socialUser.id}, reason=${reason}, error=${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined
            );
            throw this.unlinkFailure(socialUser, reason);
        }
    }

    private unlinkFailure(
        socialUser: SocialUser,
        reason: string,
        details?: Record<string, unknown>
    ): BusinessException {
        return new BusinessException(ErrorCode.SOCIAL_UNLINK_FAILED, {
            provider: socialUser.loginType,
            socialUserId: socialUser.id,
            userId: socialUser.userId,
            reason,
            ...(details ?? {}),
        });
    }

    private parseJson(bodyText: string): Record<string, unknown> | null {
        if (!bodyText || bodyText.trim().length === 0) {
            return null;
        }

        try {
            const parsed: unknown = JSON.parse(bodyText);
            if (typeof parsed === 'object' && parsed !== null) {
                return parsed as Record<string, unknown>;
            }

            return null;
        } catch {
            return null;
        }
    }

    private getStringValue(payload: Record<string, unknown> | null, key: string): string | null {
        if (!payload) {
            return null;
        }

        const value = payload[key];
        if (typeof value !== 'string') {
            return null;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
}
