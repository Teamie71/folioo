import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiCommitLog } from '../../domain/ai-commit-log.entity';

@Injectable()
export class AiCommitLogRepository {
    constructor(
        @InjectRepository(AiCommitLog)
        private readonly aiCommitLogRepository: Repository<AiCommitLog>
    ) {}

    findByUserId(userId: number): Promise<AiCommitLog | null> {
        return this.aiCommitLogRepository.findOne({ where: { userId } });
    }

    save(entity: AiCommitLog): Promise<AiCommitLog> {
        return this.aiCommitLogRepository.save(entity);
    }

    async deleteByUserId(userId: number): Promise<void> {
        await this.aiCommitLogRepository.delete({ userId });
    }
}
