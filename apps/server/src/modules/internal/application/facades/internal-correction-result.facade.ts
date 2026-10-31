import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { ExternalPortfolioService } from 'src/modules/portfolio/application/services/external-portfolio.service';
import type { ExternalPortfolioUpdateInput } from 'src/modules/portfolio/application/services/external-portfolio.service';
import { CorrectionItemService } from 'src/modules/portfolio-correction/application/services/correction-item.service';
import { CorrectionPortfolioSelectionService } from 'src/modules/portfolio-correction/application/services/correction-portfolio-selection.service';
import { PortfolioCorrectionService } from 'src/modules/portfolio-correction/application/services/portfolio-correction.service';
import { PdfExtractionStatus } from 'src/modules/portfolio-correction/domain/enums/pdf-extraction-status.enum';
import { CorrectionItem } from 'src/modules/portfolio-correction/domain/correction-item.entity';
import {
    Portfolio,
    PORTFOLIO_BLOCK_FIELD_MAX_LENGTH,
    PORTFOLIO_NAME_MAX_LENGTH,
} from 'src/modules/portfolio/domain/portfolio.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    PdfExtractionActivityReqDTO,
    PdfExtractionCallbackStatus,
    SavePdfExtractionResultReqDTO,
} from '../dtos/internal-correction-result.dto';

@Injectable()
export class InternalCorrectionResultFacade {
    private readonly logger = new Logger(InternalCorrectionResultFacade.name);

    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly externalPortfolioService: ExternalPortfolioService,
        private readonly correctionPortfolioSelectionService: CorrectionPortfolioSelectionService,
        private readonly correctionItemService: CorrectionItemService
    ) {}

    @Transactional()
    async savePdfExtractionResult(
        correctionId: number,
        body: SavePdfExtractionResultReqDTO
    ): Promise<void> {
        const correction = await this.portfolioCorrectionService.findByIdWithUser(correctionId);

        if (correction.pdfExtractionStatus !== PdfExtractionStatus.GENERATING) {
            this.logger.warn(
                `Invalid pdf extraction callback status: correctionId=${correctionId}, current=${correction.pdfExtractionStatus}, callback=${body.status}`
            );
            throw new BusinessException(ErrorCode.CORRECTION_PDF_EXTRACTION_INVALID_STATUS, {
                reason: `pdfExtractionStatus must be GENERATING before accepting callback. current=${correction.pdfExtractionStatus}, callback=${body.status}`,
            });
        }

        if (body.status === PdfExtractionCallbackStatus.FAILED) {
            this.logger.error(
                `PDF extraction failed: correctionId=${correctionId}, errorMessage=${
                    body.errorMessage ?? ''
                }`
            );
            await this.portfolioCorrectionService.updatePdfExtractionStatus(
                correctionId,
                PdfExtractionStatus.FAILED
            );
            return;
        }

        if (!body.activities || body.activities.length === 0) {
            this.logger.error(
                `PDF extraction callback invalid payload: correctionId=${correctionId}, activities is empty`
            );
            throw new BusinessException(ErrorCode.CORRECTION_PDF_EXTRACTION_EMPTY_ACTIVITIES);
        }

        const createdPortfolios: Portfolio[] =
            await this.externalPortfolioService.createExternalPortfolios(
                correction.user.id,
                body.activities.map((activity) => this.mapActivity(activity))
            );

        await this.correctionPortfolioSelectionService.activateSelections(
            correction,
            createdPortfolios
        );
        await this.correctionItemService.deleteByCorrectionId(correctionId);
        const correctionItems: CorrectionItem[] = createdPortfolios.map((portfolio) =>
            CorrectionItem.create(portfolio, correction)
        );
        await this.correctionItemService.saveAll(correctionItems);
        await this.portfolioCorrectionService.updatePdfExtractionStatus(
            correctionId,
            PdfExtractionStatus.GENERATED
        );
    }

    private mapActivity(activity: PdfExtractionActivityReqDTO): ExternalPortfolioUpdateInput {
        return {
            name: this.truncate(activity.activityName, PORTFOLIO_NAME_MAX_LENGTH),
            description: this.truncate(
                this.joinLines(activity.detail),
                PORTFOLIO_BLOCK_FIELD_MAX_LENGTH
            ),
            responsibilities: this.truncate(
                this.joinLines(activity.responsibility),
                PORTFOLIO_BLOCK_FIELD_MAX_LENGTH
            ),
            problemSolving: this.truncate(
                activity.problemSolving
                    .map(
                        (item) =>
                            `#${item.no}\n상황: ${item.situation}\n전략: ${item.strategy}\n이유: ${item.reason}`
                    )
                    .join('\n\n'),
                PORTFOLIO_BLOCK_FIELD_MAX_LENGTH
            ),
            learnings: this.truncate(
                this.joinLines(activity.learning),
                PORTFOLIO_BLOCK_FIELD_MAX_LENGTH
            ),
        };
    }

    private joinLines(lines: string[]): string {
        return lines.join('\n');
    }

    private truncate(value: string, maxLength: number): string {
        return Array.from(value).slice(0, maxLength).join('');
    }
}
