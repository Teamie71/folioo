import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Job } from '../../domain/job.entity';

@Injectable()
export class JobRepository {
    constructor(
        @InjectRepository(Job)
        private readonly repo: Repository<Job>
    ) {}

    findAllActiveByRulesetVersionId(rulesetVersionId: number): Promise<Job[]> {
        return this.repo.find({ where: { rulesetVersionId, isActive: true } });
    }

    findAllActiveByCodesAndRulesetVersionId(
        codes: readonly string[],
        rulesetVersionId: number
    ): Promise<Job[]> {
        return this.repo.find({
            where: { code: In([...codes]), rulesetVersionId, isActive: true },
        });
    }
}
