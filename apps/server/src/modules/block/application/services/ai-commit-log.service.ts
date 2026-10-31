import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { AiCommitLogRepository } from '../../infrastructure/repositories/ai-commit-log.repository';
import { AiCommitLog, DeletedBlocksSnapshot } from '../../domain/ai-commit-log.entity';

export interface RecordCommitInput {
    requestId: string;
    previousVersion: string;
    committedVersion: string;
    createdBlockIds: string[];
    updatedBlocks: Record<string, string | null>;
    deletedBlocks: DeletedBlocksSnapshot | null;
}

const REVERT_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AiCommitLogService {
    constructor(private readonly aiCommitLogRepository: AiCommitLogRepository) {}

    // 사용자가 블록을 직접 수정하면 AI 커밋은 더 이상 되돌릴 수 없으므로,
    // 되돌리기 대상 기록을 폐기한다 (만료만 기다리는 죽은 데이터로 남기지 않는다).
    async discardByUserId(userId: number): Promise<void> {
        await this.aiCommitLogRepository.deleteByUserId(userId);
    }

    // 사용자당 최신 1건만 남기는 되돌리기 스냅샷. AI 커밋 시마다 교체한다.
    // 기존 행을 update하면 created_at(@CreateDateColumn)이 갱신되지 않아 24시간 판정이
    // 첫 커밋 기준이 되므로, 지우고 새로 insert한다.
    async recordCommit(userId: number, input: RecordCommitInput): Promise<void> {
        await this.aiCommitLogRepository.deleteByUserId(userId);
        const log = new AiCommitLog();
        log.userId = userId;
        log.requestId = input.requestId;
        log.previousVersion = input.previousVersion;
        log.committedVersion = input.committedVersion;
        log.createdBlockIds = input.createdBlockIds;
        log.updatedBlocks = input.updatedBlocks;
        log.deletedBlocks = input.deletedBlocks;
        await this.aiCommitLogRepository.save(log);
    }

    // 되돌리기 대상 검증: 최신 기록과 request_id가 일치하고, 생성 후 24시간 이내여야 한다.
    async findRevertibleOrThrow(userId: number, requestId: string): Promise<AiCommitLog> {
        const log = await this.aiCommitLogRepository.findByUserId(userId);
        if (!log || log.requestId !== requestId || this.isExpired(log)) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_REVERT_EXPIRED);
        }
        return log;
    }

    // 지금 되돌릴 수 있는 AI 커밋의 request_id. revert가 409/410으로 거부할 조건이면 null.
    async findRevertibleRequestId(
        userId: number,
        currentMapVersion: string
    ): Promise<string | null> {
        const log = await this.aiCommitLogRepository.findByUserId(userId);
        if (!log || this.isExpired(log) || log.committedVersion !== currentMapVersion) {
            return null;
        }
        return log.requestId;
    }

    private isExpired(log: AiCommitLog): boolean {
        return Date.now() - log.createdAt.getTime() > REVERT_WINDOW_MS;
    }
}
