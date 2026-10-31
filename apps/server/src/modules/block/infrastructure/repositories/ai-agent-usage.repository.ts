import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiAgentUsage } from '../../domain/ai-agent-usage.entity';

@Injectable()
export class AiAgentUsageRepository {
    constructor(
        @InjectRepository(AiAgentUsage)
        private readonly aiAgentUsageRepository: Repository<AiAgentUsage>
    ) {}

    // 웹·카톡의 모든 예약/복구가 같은 사용자 잠금을 사용한다. 트랜잭션 종료 시 해제된다.
    async lockUser(userId: number, timeoutMs: number): Promise<void> {
        await this.setQueryTimeout(timeoutMs);
        await this.aiAgentUsageRepository.query('SELECT pg_advisory_xact_lock(73104, $1)', [
            userId,
        ]);
    }

    async setQueryTimeout(timeoutMs: number): Promise<void> {
        await this.aiAgentUsageRepository.query(
            "SELECT set_config('lock_timeout', $1, true), set_config('statement_timeout', $1, true)",
            [String(timeoutMs)]
        );
    }

    findByUserIdAndRequestId(userId: number, requestId: string): Promise<AiAgentUsage | null> {
        return this.aiAgentUsageRepository.findOne({ where: { userId, requestId } });
    }

    countUsed(userId: number, usageDate: string): Promise<number> {
        return this.aiAgentUsageRepository.count({ where: { userId, usageDate, failed: false } });
    }

    save(entity: AiAgentUsage): Promise<AiAgentUsage> {
        return this.aiAgentUsageRepository.save(entity);
    }

    async markFailed(userId: number, requestId: string): Promise<void> {
        await this.aiAgentUsageRepository.update({ userId, requestId }, { failed: true });
    }
}
