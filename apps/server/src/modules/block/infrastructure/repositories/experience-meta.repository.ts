import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ExperienceMeta } from '../../domain/experience-meta.entity';

@Injectable()
export class ExperienceMetaRepository {
    constructor(
        @InjectRepository(ExperienceMeta)
        private readonly experienceMetaRepository: Repository<ExperienceMeta>
    ) {}

    save(experienceMeta: ExperienceMeta): Promise<ExperienceMeta> {
        return this.experienceMetaRepository.save(experienceMeta);
    }

    async findAllByBlockIds(blockIds: string[]): Promise<ExperienceMeta[]> {
        if (blockIds.length === 0) return [];
        return this.experienceMetaRepository.find({ where: { blockId: In(blockIds) } });
    }
}
