import { Injectable } from '@nestjs/common';
import { PortfolioCorrectionRepository } from '../../infrastructure/repositories/portfolio-correction.repository';
import {
    MAX_CORRECTIONS_PER_USER,
    PortfolioCorrection,
} from '../../domain/portfolio-correction.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { CorrectionResDTO, CorrectionStatusResDTO } from '../dtos/portfolio-correction.dto';
import { CorrectionResultResDTO } from '../dtos/correction-result.dto';
import {
    UpdateCompanyInsightReqDTO,
    UpdateCompanyInsightResDTO,
} from '../dtos/company-insight.dto';
import { JobDescriptionType } from '../../domain/enums/jobdescription-type.enum';
import { CorrectionStatus } from '../../domain/enums/correction-status.enum';
import { CorrectionItemService } from './correction-item.service';
import { CorrectionPortfolioSelectionService } from './correction-portfolio-selection.service';
import { UpdateCorrectionTitleReqDTO } from '../dtos/portfolio-correction.dto';
import { CorrectionItem } from '../../domain/correction-item.entity';
import { PdfExtractionStatus } from '../../domain/enums/pdf-extraction-status.enum';

export interface InternalCorrectionPayload {
    correction: PortfolioCorrection;
    portfolioIds: number[];
    items: CorrectionItem[];
}

@Injectable()
export class PortfolioCorrectionService {
    constructor(
        private readonly portfolioCorrectionRepository: PortfolioCorrectionRepository,
        private readonly correctionItemService: CorrectionItemService,
        private readonly correctionPortfolioSelectionService: CorrectionPortfolioSelectionService
    ) {}

    async getCorrections(userId: number, keyword?: string): Promise<CorrectionResDTO[]> {
        const corrections = await this.portfolioCorrectionRepository.findAllByUserIdAndTitleKeyword(
            userId,
            keyword
        );
        return corrections.map((correction) => CorrectionResDTO.from(correction));
    }

    async validateCreation(userId: number): Promise<void> {
        const count = await this.portfolioCorrectionRepository.countByUserId(userId);
        if (count >= MAX_CORRECTIONS_PER_USER) {
            throw new BusinessException(ErrorCode.CORRECTION_MAX_LIMIT);
        }
    }

    createCorrection(
        userId: number,
        title: string,
        companyName: string,
        positionName: string,
        jobDescription: string,
        jobDescriptionType: JobDescriptionType
    ): Promise<PortfolioCorrection> {
        const correction = PortfolioCorrection.create(
            userId,
            title,
            companyName,
            positionName,
            jobDescription,
            jobDescriptionType
        );
        return this.portfolioCorrectionRepository.save(correction);
    }

    async findByIdOrThrow(correctionId: number): Promise<PortfolioCorrection> {
        const correction = await this.portfolioCorrectionRepository.findById(correctionId);
        if (!correction) {
            throw new BusinessException(ErrorCode.CORRECTION_NOT_FOUND);
        }
        return correction;
    }

    async findByIdAndUserIdOrThrow(
        correctionId: number,
        userId: number
    ): Promise<PortfolioCorrection> {
        const correction = await this.portfolioCorrectionRepository.findByIdAndUserId(
            correctionId,
            userId
        );
        if (!correction) {
            throw new BusinessException(ErrorCode.CORRECTION_NOT_FOUND);
        }
        return correction;
    }

    async transitionToGenerating(correctionId: number): Promise<void> {
        const correction = await this.findByIdOrThrow(correctionId);
        this.validateStatusTransition(correction.status, CorrectionStatus.GENERATING);
        await this.portfolioCorrectionRepository.updateById(correctionId, {
            status: CorrectionStatus.GENERATING,
        });
    }

    async getStatus(correctionId: number, userId: number): Promise<CorrectionStatusResDTO> {
        const correction = await this.findByIdAndUserIdOrThrow(correctionId, userId);
        return CorrectionStatusResDTO.from(correction);
    }

    async getCompanyInsight(
        correctionId: number,
        userId: number
    ): Promise<UpdateCompanyInsightResDTO> {
        const correction = await this.findByIdAndUserIdOrThrow(correctionId, userId);
        return UpdateCompanyInsightResDTO.from(correction);
    }

    async requestCompanyInsightCreation(correctionId: number, userId: number): Promise<boolean> {
        const correction = await this.findByIdAndUserIdOrThrow(correctionId, userId);

        if (correction.companyInsight !== null) {
            throw new BusinessException(ErrorCode.COMPANY_INSIGHT_ALREADY_EXISTS);
        }

        if (correction.status === CorrectionStatus.DOING_RAG) {
            return false;
        }

        correction.status = CorrectionStatus.DOING_RAG;
        await this.portfolioCorrectionRepository.save(correction);
        return true;
    }

    async updateCompanyInsight(
        correctionId: number,
        userId: number,
        dto: UpdateCompanyInsightReqDTO
    ): Promise<UpdateCompanyInsightResDTO> {
        const correction = await this.findByIdAndUserIdOrThrow(correctionId, userId);

        if (dto.companyInsight !== undefined && correction.companyInsight === null) {
            throw new BusinessException(ErrorCode.COMPANY_INSIGHT_NOT_READY);
        }

        if (dto.companyInsight !== undefined) {
            correction.companyInsight = dto.companyInsight;
        }
        if (dto.highlightPoint !== undefined) {
            correction.highlightPoint = dto.highlightPoint;
        }

        const saved = await this.portfolioCorrectionRepository.save(correction);
        return UpdateCompanyInsightResDTO.from(saved);
    }

    async updatePdfExtractionStatus(
        correctionId: number,
        status: PdfExtractionStatus
    ): Promise<void> {
        const correction = await this.findByIdOrThrow(correctionId);
        correction.pdfExtractionStatus = status;
        await this.portfolioCorrectionRepository.save(correction);
    }

    async updateOriginalFileName(correctionId: number, originalFileName: string): Promise<void> {
        const correction = await this.findByIdOrThrow(correctionId);
        correction.originalFileName = originalFileName;
        await this.portfolioCorrectionRepository.save(correction);
    }

    async getCorrectionDetail(
        correctionId: number,
        userId: number
    ): Promise<CorrectionResultResDTO> {
        const correction = await this.findByIdAndUserIdOrThrow(correctionId, userId);
        const items = await this.correctionItemService.findByCorrectionId(correctionId);
        return CorrectionResultResDTO.from(correction, items);
    }

    async updateTitle(
        correctionId: number,
        userId: number,
        body: UpdateCorrectionTitleReqDTO
    ): Promise<CorrectionResDTO> {
        const correction = await this.findByIdAndUserIdOrThrow(correctionId, userId);
        correction.title = body.title;
        const saved = await this.portfolioCorrectionRepository.save(correction);
        return CorrectionResDTO.from(saved);
    }

    async findByIdWithUser(correctionId: number): Promise<PortfolioCorrection> {
        const correction = await this.portfolioCorrectionRepository.findByIdWithUser(correctionId);
        if (!correction) {
            throw new BusinessException(ErrorCode.CORRECTION_NOT_FOUND);
        }
        return correction;
    }

    private async getCorrectionDetailPayload(
        correctionId: number
    ): Promise<InternalCorrectionPayload> {
        const correction = await this.findByIdWithUser(correctionId);
        const [portfolioIds, items] = await Promise.all([
            this.correctionPortfolioSelectionService.findActivePortfolioIdsByCorrectionId(
                correctionId
            ),
            this.correctionItemService.findByCorrectionId(correctionId),
        ]);
        return { correction, portfolioIds, items };
    }

    async getInternalCorrectionDetail(correctionId: number): Promise<InternalCorrectionPayload> {
        return this.getCorrectionDetailPayload(correctionId);
    }

    async updateStatusWithTransition(
        correctionId: number,
        newStatus: CorrectionStatus
    ): Promise<void> {
        const correction = await this.findByIdOrThrow(correctionId);
        this.validateStatusTransition(correction.status, newStatus);
        await this.portfolioCorrectionRepository.updateById(correctionId, { status: newStatus });
    }

    async saveCompanyInsightInternal(correctionId: number, companyInsight: string): Promise<void> {
        const correction = await this.findByIdOrThrow(correctionId);
        this.validateStatusTransition(correction.status, CorrectionStatus.COMPANY_INSIGHT);
        correction.companyInsight = companyInsight;
        correction.status = CorrectionStatus.COMPANY_INSIGHT;
        await this.portfolioCorrectionRepository.save(correction);
    }

    private validateStatusTransition(
        currentStatus: CorrectionStatus,
        newStatus: CorrectionStatus
    ): void {
        if (currentStatus === newStatus) {
            return;
        }

        if (newStatus === CorrectionStatus.FAILED || newStatus === CorrectionStatus.RAG_FAILED) {
            return;
        }

        const allowedTransitions: Record<CorrectionStatus, CorrectionStatus[]> = {
            [CorrectionStatus.NOT_STARTED]: [CorrectionStatus.DOING_RAG],
            [CorrectionStatus.DOING_RAG]: [CorrectionStatus.COMPANY_INSIGHT],
            [CorrectionStatus.COMPANY_INSIGHT]: [CorrectionStatus.GENERATING],
            [CorrectionStatus.GENERATING]: [CorrectionStatus.DONE],
            [CorrectionStatus.DONE]: [],
            [CorrectionStatus.RAG_FAILED]: [],
            [CorrectionStatus.FAILED]: [CorrectionStatus.GENERATING],
        };

        const allowed = allowedTransitions[currentStatus] ?? [];
        if (!allowed.includes(newStatus)) {
            throw new BusinessException(ErrorCode.CORRECTION_INVALID_STATUS_TRANSITION);
        }
    }

    async saveCorrectionResult(
        correctionId: number,
        items: { portfolioId: number; data: Partial<CorrectionItem> }[],
        overallReview: string,
        expectedPortfolioIds?: number[]
    ): Promise<void> {
        if (items.length === 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'At least one correction result item is required.',
            });
        }

        const correction = await this.findByIdOrThrow(correctionId);
        this.validateStatusTransition(correction.status, CorrectionStatus.DONE);

        const existingItems = await this.correctionItemService.findByCorrectionId(correctionId);
        if (existingItems.length === 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'No correction items exist for this correction.',
            });
        }

        const targetPortfolioIds = expectedPortfolioIds
            ? [...new Set(expectedPortfolioIds)]
            : existingItems.map((item) => item.portfolio.id);

        if (targetPortfolioIds.length === 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'No target portfolio items to update.',
            });
        }

        const itemMap = new Map(existingItems.map((item) => [item.portfolio.id, item]));
        const providedIds = new Set<number>();

        for (const targetPortfolioId of targetPortfolioIds) {
            if (!itemMap.has(targetPortfolioId)) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, {
                    reason: `Unknown target portfolioId for correction result: ${targetPortfolioId}`,
                });
            }
        }

        const itemsToUpdate: CorrectionItem[] = [];
        for (const { portfolioId, data } of items) {
            if (!targetPortfolioIds.includes(portfolioId)) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, {
                    reason: `Unexpected portfolioId in correction result: ${portfolioId}`,
                });
            }
            if (providedIds.has(portfolioId)) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, {
                    reason: `Duplicate portfolioId in correction result: ${portfolioId}`,
                });
            }
            providedIds.add(portfolioId);

            const existingItem = itemMap.get(portfolioId);
            if (!existingItem) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, {
                    reason: `Unknown portfolioId in correction result: ${portfolioId}`,
                });
            }

            existingItem.description = data.description ?? existingItem.description;
            existingItem.responsibilities = data.responsibilities ?? existingItem.responsibilities;
            existingItem.problemSolving = data.problemSolving ?? existingItem.problemSolving;
            existingItem.learnings = data.learnings ?? existingItem.learnings;
            itemsToUpdate.push(existingItem);
        }

        if (itemsToUpdate.length !== targetPortfolioIds.length) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'Correction result must include all selected portfolio items.',
            });
        }

        await this.correctionItemService.saveAll(itemsToUpdate);

        await this.portfolioCorrectionRepository.updateById(correctionId, {
            status: CorrectionStatus.DONE,
            overallReview,
        });
    }

    async deleteCorrection(correctionId: number, userId: number): Promise<void> {
        await this.findByIdAndUserIdOrThrow(correctionId, userId);
        await this.correctionItemService.deleteByCorrectionId(correctionId);

        const affected = await this.portfolioCorrectionRepository.deleteById(correctionId);
        if (affected === 0) {
            throw new BusinessException(ErrorCode.CORRECTION_NOT_FOUND);
        }
    }
}
