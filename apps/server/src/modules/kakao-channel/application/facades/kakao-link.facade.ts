import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from 'typeorm-transactional';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { UserService } from 'src/modules/user/application/services/user.service';
import { KakaoOAuthClient } from '../../infrastructure/clients/kakao-oauth.client';
import { KakaoChannelLinkService } from '../services/kakao-channel-link.service';
import { KakaoLinkTokenService } from '../services/kakao-link-token.service';
import type { KakaoLinkState } from '../services/kakao-link-token.service';
import type {
    KakaoLinkAuthorizeResDTO,
    KakaoLinkCallbackQuery,
    KakaoLinkStatusResDTO,
} from '../dtos/kakao-link.dto';

type CallbackError = 'CANCELED' | 'INVALID_STATE' | 'FAILED';

@Injectable()
export class KakaoLinkFacade {
    private readonly logger = new Logger(KakaoLinkFacade.name);

    constructor(
        private readonly userService: UserService,
        private readonly linkService: KakaoChannelLinkService,
        private readonly tokenService: KakaoLinkTokenService,
        private readonly oauthClient: KakaoOAuthClient,
        private readonly configService: ConfigService
    ) {}

    authorize(userId: number): KakaoLinkAuthorizeResDTO {
        return {
            authorize_url: this.oauthClient.buildAuthorizeUrl(this.tokenService.signState(userId)),
        };
    }

    async callback(query: KakaoLinkCallbackQuery): Promise<string> {
        let state: KakaoLinkState;
        try {
            if (typeof query.state !== 'string' || !query.state) {
                throw new BusinessException(ErrorCode.KAKAO_LINK_TOKEN_INVALID);
            }
            state = this.tokenService.verifyState(query.state);
        } catch {
            return this.resultUrl({ error: 'INVALID_STATE' });
        }
        if (query.error === 'access_denied') return this.resultUrl({ error: 'CANCELED' });
        if (query.error || typeof query.code !== 'string' || !query.code)
            return this.resultUrl({ error: 'FAILED' });
        try {
            const kakaoUserId = await this.oauthClient.fetchKakaoUserId(query.code);
            return this.resultUrl({
                linkToken: this.tokenService.signLinkToken(state.uid, kakaoUserId),
            });
        } catch {
            // Axios 예외에는 code·client_secret·액세스 토큰이 들어갈 수 있으므로 원문을 기록하지 않는다.
            this.logger.error('Kakao linking callback failed');
            return this.resultUrl({ error: 'FAILED' });
        }
    }

    @Transactional()
    async link(userId: number, linkToken: string): Promise<string> {
        const { uid, kid } = this.tokenService.verifyLinkToken(linkToken);
        if (uid !== userId) throw new BusinessException(ErrorCode.KAKAO_LINK_TOKEN_INVALID);

        const ownLink = await this.linkService.findByUserId(userId);
        if (ownLink) {
            if (ownLink.kakaoAppUserId !== kid)
                throw new BusinessException(ErrorCode.KAKAO_CHANNEL_ALREADY_LINKED);
            return '카카오 계정 연결을 완료했습니다.';
        }
        const ownKakaoLoginId = await this.userService.findKakaoLoginIdByUserId(userId);
        if (ownKakaoLoginId && ownKakaoLoginId !== kid) {
            throw new BusinessException(ErrorCode.KAKAO_CHANNEL_ALREADY_LINKED);
        }

        const otherLink = await this.linkService.findByKakaoAppUserId(kid);
        if (otherLink && otherLink.userId !== userId) {
            const owner = await this.userService.findByIdOrThrow(otherLink.userId);
            if (!owner.isDeactivated())
                throw new BusinessException(ErrorCode.KAKAO_ACCOUNT_ALREADY_LINKED);
        }
        const kakaoUser = await this.userService.findByKakaoLoginId(kid);
        if (kakaoUser && kakaoUser.id !== userId && !kakaoUser.isDeactivated()) {
            throw new BusinessException(ErrorCode.KAKAO_ACCOUNT_ALREADY_LINKED);
        }
        if (otherLink && otherLink.userId !== userId)
            await this.linkService.unlink(otherLink.userId);
        await this.linkService.linkOrThrow(userId, kid);
        return '카카오 계정 연결을 완료했습니다.';
    }

    async status(userId: number): Promise<KakaoLinkStatusResDTO> {
        const link = await this.linkService.findByUserId(userId);
        return { linked: !!link || !!(await this.userService.findKakaoLoginIdByUserId(userId)) };
    }

    private resultUrl(result: { linkToken?: string; error?: CallbackError }): string {
        const url = new URL(this.configService.getOrThrow<string>('KAKAO_LINK_RESULT_URL'));
        url.searchParams.delete('link_token');
        url.searchParams.delete('error');
        if (result.linkToken) url.searchParams.set('link_token', result.linkToken);
        if (result.error) url.searchParams.set('error', result.error);
        return url.toString();
    }
}
