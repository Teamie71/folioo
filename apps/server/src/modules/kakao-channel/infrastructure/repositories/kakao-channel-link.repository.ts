import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KakaoChannelLink } from '../../domain/kakao-channel-link.entity';

@Injectable()
export class KakaoChannelLinkRepository {
    constructor(
        @InjectRepository(KakaoChannelLink)
        private readonly kakaoChannelLinkRepository: Repository<KakaoChannelLink>
    ) {}

    findByKakaoAppUserId(kakaoAppUserId: string): Promise<KakaoChannelLink | null> {
        return this.kakaoChannelLinkRepository.findOne({ where: { kakaoAppUserId } });
    }

    findByUserId(userId: number): Promise<KakaoChannelLink | null> {
        return this.kakaoChannelLinkRepository.findOne({ where: { userId } });
    }

    // 같은 사용자의 첫 메시지가 동시에 들어와도 한 행만 남도록 충돌은 무시한다.
    async insertIgnoringConflict(link: KakaoChannelLink): Promise<void> {
        await this.kakaoChannelLinkRepository
            .createQueryBuilder()
            .insert()
            .values(link)
            .orIgnore()
            .execute();
    }

    async deleteByUserId(userId: number): Promise<void> {
        await this.kakaoChannelLinkRepository.delete({ userId });
    }

    async selectBlock(userId: number, blockId: string): Promise<boolean> {
        const result = await this.kakaoChannelLinkRepository
            .createQueryBuilder()
            .update()
            .set({ currentBlockId: blockId, activitySelectedAt: new Date() })
            .where('user_id = :userId', { userId })
            .andWhere('(turn_locked_until IS NULL OR turn_locked_until <= now())')
            .execute();
        return result.affected === 1;
    }

    async setQueryTimeout(timeoutMs: number): Promise<void> {
        await this.kakaoChannelLinkRepository.query(
            "SELECT set_config('lock_timeout', $1, true), set_config('statement_timeout', $1, true)",
            [String(timeoutMs)]
        );
    }

    async acquireTurnLock(userId: number, blockId: string, requestId: string): Promise<boolean> {
        const result = await this.kakaoChannelLinkRepository
            .createQueryBuilder()
            .update()
            .set({
                turnRequestId: requestId,
                turnLockedUntil: () => "now() + interval '5 minutes'",
            })
            .where('user_id = :userId AND current_block_id = :blockId', { userId, blockId })
            .andWhere('(turn_locked_until IS NULL OR turn_locked_until <= now())')
            .execute();
        return result.affected === 1;
    }

    async releaseTurnLock(userId: number, requestId: string): Promise<void> {
        await this.kakaoChannelLinkRepository.update(
            { userId, turnRequestId: requestId },
            { turnRequestId: null, turnLockedUntil: null }
        );
    }

    // 사용자 ID 순서로 순회해 오래된 불명 요청이 새 요청의 복구를 막지 않게 한다.
    findPendingTurns(afterUserId: number, limit = 10): Promise<KakaoChannelLink[]> {
        return this.kakaoChannelLinkRepository
            .createQueryBuilder('link')
            .where('link.turnRequestId IS NOT NULL AND link.userId > :afterUserId', { afterUserId })
            .orderBy('link.userId', 'ASC')
            .take(limit)
            .getMany();
    }

    async resetSelection(userId: number): Promise<void> {
        await this.kakaoChannelLinkRepository.update(
            { userId },
            { currentBlockId: null, activitySelectedAt: null }
        );
    }
}
