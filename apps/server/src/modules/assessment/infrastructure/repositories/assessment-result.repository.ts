import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentResult } from '../../domain/assessment-result.entity';

@Injectable()
export class AssessmentResultRepository {
    constructor(
        @InjectRepository(AssessmentResult)
        private readonly repo: Repository<AssessmentResult>
    ) {}

    save(result: AssessmentResult): Promise<AssessmentResult> {
        return this.repo.save(result);
    }

    findByUuid(uuid: string): Promise<AssessmentResult | null> {
        return this.repo.findOne({ where: { uuid } });
    }

    findLatestByUserId(userId: number): Promise<AssessmentResult | null> {
        return this.repo.findOne({ where: { userId }, order: { createdAt: 'DESC' } });
    }
}
