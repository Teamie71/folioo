import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RulesetVersion } from '../../domain/ruleset-version.entity';

@Injectable()
export class RulesetVersionRepository {
    constructor(
        @InjectRepository(RulesetVersion)
        private readonly repo: Repository<RulesetVersion>
    ) {}

    findLatest(): Promise<RulesetVersion | null> {
        return this.repo.findOne({ where: {}, order: { id: 'DESC' } });
    }
}
