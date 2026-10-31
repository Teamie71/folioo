import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { AiRelayPort } from 'src/common/ports/ai-relay.port';
import {
    AiExperienceSessionRepository,
    LatestAiRequestRow,
} from '../../infrastructure/repositories/ai-experience-session.repository';
import { AiExperienceSession } from '../../domain/ai-experience-session.entity';
import { AiExperienceRequestStatus } from '../../domain/enums/ai-experience-request-status.enum';

interface CreateSessionAiResponse {
    session_id: string;
}

export type ActivityStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface ActivityStatusItem {
    blockId: string;
    requestId: string;
    status: ActivityStatus;
    seen: boolean;
}

// AI 서버 /state가 조회 전에 하던 정리를 그대로 반영한다.
// - running인데 lease가 만료됐으면 처리 중 서버가 죽은 것이므로 실패
// - failed + error.code='cancelled'는 사용자가 중지한 요청
function resolveStatus(row: LatestAiRequestRow, now: Date): ActivityStatus {
    if (row.status === AiExperienceRequestStatus.RUNNING) {
        const leaseExpired = row.leaseExpiresAt !== null && row.leaseExpiresAt < now;
        return leaseExpired ? 'failed' : 'running';
    }
    if (row.status === AiExperienceRequestStatus.FAILED && row.errorCode === 'cancelled') {
        return 'cancelled';
    }
    return row.status === AiExperienceRequestStatus.COMPLETED ? 'completed' : 'failed';
}

@Injectable()
export class AiExperienceSessionService {
    constructor(
        private readonly aiExperienceSessionRepository: AiExperienceSessionRepository,
        private readonly aiRelayPort: AiRelayPort
    ) {}

    async getOrCreate(
        userId: number,
        blockId: string,
        timeoutMs?: number
    ): Promise<AiExperienceSession> {
        const startedAt = Date.now();
        const remaining = (): number | undefined => {
            if (timeoutMs === undefined) return undefined;
            const left = timeoutMs - (Date.now() - startedAt);
            if (left <= 0) throw new BusinessException(ErrorCode.AI_RELAY_REQUEST_FAILED);
            return left;
        };
        const existing = await this.aiExperienceSessionRepository.findByUserIdAndBlockId(
            userId,
            blockId,
            remaining()
        );
        if (existing) {
            return existing;
        }

        const response = await this.aiRelayPort.postJson<CreateSessionAiResponse>({
            path: '/sessions',
            body: { user_id: String(userId), block_id: blockId },
            timeoutMs: remaining(),
        });

        if (!isUUID(response.data?.session_id)) {
            throw new BusinessException(ErrorCode.AI_RELAY_REQUEST_FAILED);
        }

        const session = new AiExperienceSession();
        session.userId = userId;
        session.blockId = blockId;
        session.sessionId = response.data.session_id;
        await this.aiExperienceSessionRepository.insertIgnoringConflict(session, remaining());
        const saved = await this.aiExperienceSessionRepository.findByUserIdAndBlockId(
            userId,
            blockId,
            remaining()
        );
        if (!saved) throw new BusinessException(ErrorCode.AI_RELAY_REQUEST_FAILED);
        return saved;
    }

    async getActivityStatuses(
        userId: number,
        now: Date = new Date()
    ): Promise<ActivityStatusItem[]> {
        const rows = await this.aiExperienceSessionRepository.findLatestRequests(userId);
        return rows.map((row) => ({
            blockId: row.blockId,
            requestId: row.requestId,
            status: resolveStatus(row, now),
            seen: row.lastSeenRequestId === row.requestId,
        }));
    }

    // 최신 요청을 확인한 것으로 기록한다. 요청이 없는 활동은 무시한다(멱등).
    // 처리 중인 요청은 기록하지 않는다. 기록하면 사용자가 채팅을 떠난 뒤 완료돼도 초록 점이 뜨지 않는다.
    async markSeen(userId: number, blockId: string, now: Date = new Date()): Promise<void> {
        const [latest] = await this.aiExperienceSessionRepository.findLatestRequests(
            userId,
            blockId
        );
        if (!latest || resolveStatus(latest, now) === 'running') {
            return;
        }
        await this.aiExperienceSessionRepository.updateLastSeenRequestId(
            userId,
            blockId,
            latest.requestId
        );
    }
}
