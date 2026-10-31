import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiCommitRequest } from '../../domain/ai-commit-request.entity';

@Injectable()
export class AiCommitRequestRepository {
    constructor(
        @InjectRepository(AiCommitRequest)
        private readonly aiCommitRequestRepository: Repository<AiCommitRequest>
    ) {}

    findByUserIdAndRequestId(userId: number, requestId: string): Promise<AiCommitRequest | null> {
        return this.aiCommitRequestRepository.findOne({ where: { userId, requestId } });
    }

    // GET /commit/{request_id}는 경로에 user_id가 없다. request_id는 메인 서버가 생성하는
    // UUID라 사실상 전역 유일하므로 request_id 단독으로 조회한다.
    findByRequestId(requestId: string): Promise<AiCommitRequest | null> {
        return this.aiCommitRequestRepository.findOne({ where: { requestId } });
    }

    save(entity: AiCommitRequest): Promise<AiCommitRequest> {
        return this.aiCommitRequestRepository.save(entity);
    }
}
