import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExperienceMap } from '../../domain/experience-map.entity';

@Injectable()
export class ExperienceMapRepository {
    constructor(
        @InjectRepository(ExperienceMap)
        private readonly experienceMapRepository: Repository<ExperienceMap>
    ) {}

    save(experienceMap: ExperienceMap): Promise<ExperienceMap> {
        return this.experienceMapRepository.save(experienceMap);
    }

    async findByUserId(userId: number): Promise<ExperienceMap | null> {
        return this.experienceMapRepository.findOne({ where: { userId } });
    }

    // AI 커밋은 한 사용자에게 동시에 여러 건이 들어올 수 있어 낙관적 CAS만으로는 부족하다.
    // 트랜잭션 안에서 행을 잠가 base_map_version 확인부터 커밋까지를 직렬화한다.
    async findByUserIdForUpdate(userId: number): Promise<ExperienceMap | null> {
        return this.experienceMapRepository.findOne({
            where: { userId },
            lock: { mode: 'pessimistic_write' },
        });
    }
}
