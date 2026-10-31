import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyType } from '../../domain/company-type.entity';

@Injectable()
export class CompanyTypeRepository {
    constructor(
        @InjectRepository(CompanyType)
        private readonly repo: Repository<CompanyType>
    ) {}

    findAllActiveByRulesetVersionId(rulesetVersionId: number): Promise<CompanyType[]> {
        return this.repo.find({ where: { rulesetVersionId, isActive: true } });
    }
}
