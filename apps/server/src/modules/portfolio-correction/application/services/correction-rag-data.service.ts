import { Injectable } from '@nestjs/common';
import { CorrectionRagDataRepository } from '../../infrastructure/repositories/correction-rag-data.repository';
import { CorrectionRagData } from '../../domain/correction-rag-data.entity';
import { PortfolioCorrectionService } from './portfolio-correction.service';

@Injectable()
export class CorrectionRagDataService {
    constructor(
        private readonly correctionRagDataRepository: CorrectionRagDataRepository,
        private readonly portfolioCorrectionService: PortfolioCorrectionService
    ) {}

    async createRagData(
        correctionId: number,
        searchQuery: string,
        searchResults: Record<string, unknown>
    ): Promise<CorrectionRagData> {
        await this.portfolioCorrectionService.findByIdOrThrow(correctionId);
        const ragData = CorrectionRagData.create(correctionId, searchQuery, searchResults);
        return this.correctionRagDataRepository.save(ragData);
    }

    async findByCorrectionId(correctionId: number): Promise<CorrectionRagData[]> {
        await this.portfolioCorrectionService.findByIdOrThrow(correctionId);
        return this.correctionRagDataRepository.findByCorrectionId(correctionId);
    }
}
