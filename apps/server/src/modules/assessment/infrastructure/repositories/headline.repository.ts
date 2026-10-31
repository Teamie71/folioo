import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Headline } from '../../domain/headline.entity';

@Injectable()
export class HeadlineRepository {
    constructor(
        @InjectRepository(Headline)
        private readonly repo: Repository<Headline>
    ) {}

    findByValueAndTrait(topValue: string, topTrait: string): Promise<Headline | null> {
        return this.repo.findOne({ where: { topValue, topTrait } });
    }

    findAll(): Promise<Headline[]> {
        return this.repo.find();
    }
}
