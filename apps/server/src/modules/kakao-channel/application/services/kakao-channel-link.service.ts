import { Injectable } from '@nestjs/common';
import { KakaoChannelLink } from '../../domain/kakao-channel-link.entity';
import { KakaoChannelLinkRepository } from '../../infrastructure/repositories/kakao-channel-link.repository';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class KakaoChannelLinkService {
    constructor(private readonly kakaoChannelLinkRepository: KakaoChannelLinkRepository) {}

    findByKakaoAppUserId(kakaoAppUserId: string): Promise<KakaoChannelLink | null> {
        return this.kakaoChannelLinkRepository.findByKakaoAppUserId(kakaoAppUserId);
    }

    findByUserId(userId: number): Promise<KakaoChannelLink | null> {
        return this.kakaoChannelLinkRepository.findByUserId(userId);
    }

    // Facade에서 social_user·활성 상태를 확인한 뒤 저장한다. 동시 연결 충돌도 DB 제약으로 판정한다.
    async linkOrThrow(userId: number, kakaoAppUserId: string): Promise<void> {
        await this.kakaoChannelLinkRepository.insertIgnoringConflict(
            KakaoChannelLink.create(userId, kakaoAppUserId)
        );
        const ownLink = await this.findByUserId(userId);
        if (!ownLink) throw new BusinessException(ErrorCode.KAKAO_ACCOUNT_ALREADY_LINKED);
        if (ownLink.kakaoAppUserId !== kakaoAppUserId) {
            throw new BusinessException(ErrorCode.KAKAO_CHANNEL_ALREADY_LINKED);
        }
    }

    async link(userId: number, kakaoAppUserId: string): Promise<KakaoChannelLink> {
        await this.kakaoChannelLinkRepository.insertIgnoringConflict(
            KakaoChannelLink.create(userId, kakaoAppUserId)
        );
        const link = await this.findByKakaoAppUserId(kakaoAppUserId);
        if (!link || link.userId !== userId) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
        return link;
    }

    isTurnInProgress(link: KakaoChannelLink, now = new Date()): boolean {
        return (link.turnLockedUntil?.getTime() ?? 0) > now.getTime();
    }

    async unlink(userId: number): Promise<void> {
        await this.kakaoChannelLinkRepository.deleteByUserId(userId);
    }

    // 활동 소유권 검증은 이 메서드를 호출하기 전 Facade에서 수행한다.
    selectBlock(userId: number, blockId: string): Promise<boolean> {
        return this.kakaoChannelLinkRepository.selectBlock(userId, blockId);
    }

    setQueryTimeout(timeoutMs: number): Promise<void> {
        return this.kakaoChannelLinkRepository.setQueryTimeout(timeoutMs);
    }

    acquireTurnLock(userId: number, blockId: string, requestId: string): Promise<boolean> {
        return this.kakaoChannelLinkRepository.acquireTurnLock(userId, blockId, requestId);
    }

    releaseTurnLock(userId: number, requestId: string): Promise<void> {
        return this.kakaoChannelLinkRepository.releaseTurnLock(userId, requestId);
    }

    findPendingTurns(afterUserId: number): Promise<KakaoChannelLink[]> {
        return this.kakaoChannelLinkRepository.findPendingTurns(afterUserId);
    }

    resetSelection(userId: number): Promise<void> {
        return this.kakaoChannelLinkRepository.resetSelection(userId);
    }
}
