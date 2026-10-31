import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import {
    ExternalPortfolioService,
    ExternalPortfolioUpdateInput,
} from 'src/modules/portfolio/application/services/external-portfolio.service';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import { PortfolioCorrectionService } from '../services/portfolio-correction.service';
import { CorrectionPortfolioSelectionService } from '../services/correction-portfolio-selection.service';
import { CorrectionItemService } from '../services/correction-item.service';
import { PdfExtractService } from '../services/pdf-extract.service';
import {
    ExternalPortfolioListResDTO,
    StructuredPortfolioResDTO,
    UpdatePortfolioBlockReqDTO,
} from '../dtos/external-portfolio.dto';
import { MAX_EXTERNAL_PORTFOLIO_BLOCKS } from 'src/modules/portfolio/domain/portfolio.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { PdfExtractionStatus } from 'src/modules/portfolio-correction/domain/enums/pdf-extraction-status.enum';

@Injectable()
export class ExternalPortfolioFacade {
    constructor(
        private readonly externalPortfolioService: ExternalPortfolioService,
        private readonly portfolioService: PortfolioService,
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly correctionPortfolioSelectionService: CorrectionPortfolioSelectionService,
        private readonly correctionItemService: CorrectionItemService,
        private readonly pdfExtractService: PdfExtractService
    ) {}

    async extractPortfolio(
        userId: number,
        correctionId: number,
        fileBuffer: Buffer,
        fileName: string
    ): Promise<string> {
        await this.portfolioCorrectionService.findByIdAndUserIdOrThrow(correctionId, userId);

        const { message } = await this.pdfExtractService.extractText(
            correctionId,
            fileBuffer,
            fileName
        );

        await this.portfolioCorrectionService.updatePdfExtractionStatus(
            correctionId,
            PdfExtractionStatus.GENERATING
        );
        await this.portfolioCorrectionService.updateOriginalFileName(correctionId, fileName);
        return message;
    }

    async getSelectedPortfolios(
        correctionId: number,
        userId: number
    ): Promise<ExternalPortfolioListResDTO> {
        const correction = await this.portfolioCorrectionService.findByIdAndUserIdOrThrow(
            correctionId,
            userId
        );

        const portfolioIds =
            await this.correctionPortfolioSelectionService.findActivePortfolioIdsByCorrectionId(
                correctionId
            );

        if (portfolioIds.length === 0) {
            return ExternalPortfolioListResDTO.from(
                correction.pdfExtractionStatus,
                correction.originalFileName,
                []
            );
        }

        const portfolios = await this.portfolioService.findByIds(portfolioIds);
        return ExternalPortfolioListResDTO.from(
            correction.pdfExtractionStatus,
            correction.originalFileName,
            portfolios
        );
    }

    @Transactional()
    async createExternalPortfolioBlock(
        correctionId: number,
        userId: number
    ): Promise<StructuredPortfolioResDTO> {
        const correction = await this.portfolioCorrectionService.findByIdAndUserIdOrThrow(
            correctionId,
            userId
        );

        const activePortfolioIds =
            await this.correctionPortfolioSelectionService.findActivePortfolioIdsByCorrectionId(
                correctionId
            );
        const currentCount = activePortfolioIds.length;

        if (currentCount >= MAX_EXTERNAL_PORTFOLIO_BLOCKS) {
            throw new BusinessException(ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED);
        }

        const activePortfolios =
            activePortfolioIds.length === 0
                ? []
                : await this.portfolioService.findByIdsAndUserIdOrThrow(activePortfolioIds, userId);

        const savedPortfolio = await this.externalPortfolioService.createEmptyPortfolio(userId);
        await this.correctionPortfolioSelectionService.activateSelections(correction, [
            ...activePortfolios,
            savedPortfolio,
        ]);

        return StructuredPortfolioResDTO.from(savedPortfolio);
    }

    @Transactional()
    async updateExternalPortfolio(
        portfolioId: number,
        userId: number,
        body: UpdatePortfolioBlockReqDTO
    ): Promise<StructuredPortfolioResDTO> {
        const updateInput: ExternalPortfolioUpdateInput = {
            name: body.name,
            description: body.description,
            responsibilities: body.responsibilities,
            problemSolving: body.problemSolving,
            learnings: body.learnings,
        };
        const updatedPortfolio = await this.externalPortfolioService.updateExternalPortfolio(
            portfolioId,
            userId,
            updateInput
        );
        return StructuredPortfolioResDTO.from(updatedPortfolio);
    }

    @Transactional()
    async deleteExternalPortfolio(portfolioId: number, userId: number): Promise<void> {
        await this.portfolioService.findByIdsAndUserIdOrThrow([portfolioId], userId);

        await Promise.all([
            this.correctionItemService.deleteByPortfolioId(portfolioId),
            this.correctionPortfolioSelectionService.deleteByPortfolioId(portfolioId),
        ]);

        await this.externalPortfolioService.deleteExternalPortfolio(portfolioId, userId);
    }
}
