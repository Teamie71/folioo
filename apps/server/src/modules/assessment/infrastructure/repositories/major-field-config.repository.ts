import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MajorFieldConfig } from '../../domain/major-field-config.entity';

@Injectable()
export class MajorFieldConfigRepository {
    constructor(
        @InjectRepository(MajorFieldConfig)
        private readonly repo: Repository<MajorFieldConfig>
    ) {}

    findAllByRulesetVersionId(rulesetVersionId: number): Promise<MajorFieldConfig[]> {
        return this.repo.find({ where: { rulesetVersionId } });
    }
}
