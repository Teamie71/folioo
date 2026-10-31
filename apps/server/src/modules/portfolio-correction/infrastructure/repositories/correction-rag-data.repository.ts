import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorrectionRagData } from '../../domain/correction-rag-data.entity';

@Injectable()
export class CorrectionRagDataRepository {
    constructor(
        @InjectRepository(CorrectionRagData)
        private readonly correctionRagDataRepository: Repository<CorrectionRagData>
    ) {}

    save(ragData: CorrectionRagData): Promise<CorrectionRagData> {
        return this.correctionRagDataRepository.save(ragData);
    }

    findByCorrectionId(correctionId: number): Promise<CorrectionRagData[]> {
        return this.correctionRagDataRepository.find({
            where: { portfolioCorrection: { id: correctionId } },
            order: { createdAt: 'ASC' },
        });
    }
}
