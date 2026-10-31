import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { ExperienceMapRepository } from '../../infrastructure/repositories/experience-map.repository';
import { ExperienceMap } from '../../domain/experience-map.entity';

@Injectable()
export class ExperienceMapService {
    constructor(private readonly experienceMapRepository: ExperienceMapRepository) {}

    async tryFind(userId: number): Promise<ExperienceMap | null> {
        return this.experienceMapRepository.findByUserId(userId);
    }

    async findForUpdateOrThrow(userId: number): Promise<ExperienceMap> {
        const experienceMap = await this.experienceMapRepository.findByUserIdForUpdate(userId);
        if (!experienceMap) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_NOT_INITIALIZED);
        }
        return experienceMap;
    }

    async getOrCreate(userId: number): Promise<ExperienceMap> {
        const existing = await this.experienceMapRepository.findByUserId(userId);
        if (existing) {
            return existing;
        }

        const experienceMap = new ExperienceMap();
        experienceMap.userId = userId;
        experienceMap.mapVersion = '1';
        return this.experienceMapRepository.save(experienceMap);
    }

    assertVersion(experienceMap: ExperienceMap, expectedMapVersion: string): void {
        if (experienceMap.mapVersion !== expectedMapVersion) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_VERSION_CONFLICT, {
                currentMapVersion: experienceMap.mapVersion,
                expectedMapVersion,
            });
        }
    }

    async bumpVersion(experienceMap: ExperienceMap): Promise<ExperienceMap> {
        experienceMap.mapVersion = String(BigInt(experienceMap.mapVersion) + 1n);
        return this.experienceMapRepository.save(experienceMap);
    }
}
