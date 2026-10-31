import { Injectable } from '@nestjs/common';
import { ExperienceMetaRepository } from '../../infrastructure/repositories/experience-meta.repository';
import { ExperienceMeta } from '../../domain/experience-meta.entity';

@Injectable()
export class ExperienceMetaService {
    constructor(private readonly experienceMetaRepository: ExperienceMetaRepository) {}

    async findAllByBlockIds(blockIds: string[]): Promise<ExperienceMeta[]> {
        return this.experienceMetaRepository.findAllByBlockIds(blockIds);
    }
}
