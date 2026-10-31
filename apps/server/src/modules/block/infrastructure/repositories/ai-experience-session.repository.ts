import { Transactional } from 'typeorm-transactional';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiExperienceSession } from '../../domain/ai-experience-session.entity';
import { AiExperienceRequest } from '../../domain/ai-experience-request.entity';
import { AiExperienceRequestStatus } from '../../domain/enums/ai-experience-request-status.enum';

export interface LatestAiRequestRow {
    blockId: string;
    lastSeenRequestId: string | null;
    requestId: string;
    status: AiExperienceRequestStatus;
    leaseExpiresAt: Date | null;
    errorCode: string | null;
}

@Injectable()
export class AiExperienceSessionRepository {
    constructor(
        @InjectRepository(AiExperienceSession)
        private readonly aiExperienceSessionRepository: Repository<AiExperienceSession>
    ) {}

    @Transactional()
    async findByUserIdAndBlockId(
        userId: number,
        blockId: string,
        timeoutMs?: number
    ): Promise<AiExperienceSession | null> {
        if (timeoutMs !== undefined) await this.setQueryTimeout(timeoutMs);
        return this.aiExperienceSessionRepository.findOne({ where: { userId, blockId } });
    }

    private async setQueryTimeout(timeoutMs: number): Promise<void> {
        await this.aiExperienceSessionRepository.query(
            "SELECT set_config('lock_timeout', $1, true), set_config('statement_timeout', $1, true)",
            [String(timeoutMs)]
        );
    }

    // 활동(세션)별 최신 요청 1건. 요청이 한 번도 없는 활동은 포함되지 않는다.
    findLatestRequests(userId: number, blockId?: string): Promise<LatestAiRequestRow[]> {
        const query = this.aiExperienceSessionRepository
            .createQueryBuilder('s')
            .innerJoin(
                AiExperienceRequest,
                'r',
                'r.user_id = s.user_id AND r.session_id = s.session_id'
            )
            .select('s.block_id', 'blockId')
            .addSelect('s.last_seen_request_id', 'lastSeenRequestId')
            .addSelect('r.request_id', 'requestId')
            .addSelect('r.status', 'status')
            .addSelect('r.lease_expires_at', 'leaseExpiresAt')
            .addSelect("r.error->>'code'", 'errorCode')
            .distinctOn(['s.block_id'])
            .where('s.user_id = :userId', { userId })
            .orderBy('s.block_id')
            .addOrderBy('r.created_at', 'DESC');
        if (blockId) {
            query.andWhere('s.block_id = :blockId', { blockId });
        }
        return query.getRawMany<LatestAiRequestRow>();
    }

    // active_gap은 AI 서버가 쓰는 칼럼이라 save() 대신 이 칼럼만 갱신한다.
    async updateLastSeenRequestId(
        userId: number,
        blockId: string,
        requestId: string
    ): Promise<void> {
        await this.aiExperienceSessionRepository.update(
            { userId, blockId },
            { lastSeenRequestId: requestId }
        );
    }

    @Transactional()
    async insertIgnoringConflict(entity: AiExperienceSession, timeoutMs?: number): Promise<void> {
        if (timeoutMs !== undefined) await this.setQueryTimeout(timeoutMs);
        await this.aiExperienceSessionRepository
            .createQueryBuilder()
            .insert()
            .values({
                userId: entity.userId,
                blockId: entity.blockId,
                sessionId: entity.sessionId,
            })
            .orIgnore()
            .execute();
    }
}
