jest.mock('typeorm-transactional', () => ({ Transactional: () => () => undefined }));
jest.mock('src/modules/portfolio-correction/application/correction-error-reporter');
import { Logger } from '@nestjs/common';
import { reportCorrectionAiPdfFailure } from 'src/modules/portfolio-correction/application/correction-error-reporter';
import { PdfExtractionStatus } from 'src/modules/portfolio-correction/domain/enums/pdf-extraction-status.enum';
import type { PortfolioCorrectionService } from 'src/modules/portfolio-correction/application/services/portfolio-correction.service';
import type { ExternalPortfolioService } from 'src/modules/portfolio/application/services/external-portfolio.service';
import type { CorrectionPortfolioSelectionService } from 'src/modules/portfolio-correction/application/services/correction-portfolio-selection.service';
import type { CorrectionItemService } from 'src/modules/portfolio-correction/application/services/correction-item.service';
import {
    PdfExtractionCallbackStatus,
    type SavePdfExtractionResultReqDTO,
} from '../dtos/internal-correction-result.dto';
import { InternalCorrectionResultFacade } from './internal-correction-result.facade';

describe('InternalCorrectionResultFacade PDF 추출 실패 콜백', () => {
    const corrections = {
        findByIdWithUser: jest.fn(),
        updatePdfExtractionStatus: jest.fn(),
    };
    let facade: InternalCorrectionResultFacade;
    let logError: jest.SpyInstance;
    let logDebug: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        logDebug = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
        corrections.findByIdWithUser.mockResolvedValue({
            pdfExtractionStatus: PdfExtractionStatus.GENERATING,
            user: { id: 3 },
        });
        facade = new InternalCorrectionResultFacade(
            corrections as unknown as PortfolioCorrectionService,
            {} as ExternalPortfolioService,
            {} as CorrectionPortfolioSelectionService,
            {} as CorrectionItemService
        );
    });

    afterEach(() => jest.restoreAllMocks());

    it('error 로그(Sentry Logs로 감)에는 AI 오류 원문을 넣지 않고 debug에만 남긴다', async () => {
        await facade.savePdfExtractionResult(10, {
            status: PdfExtractionCallbackStatus.FAILED,
            errorMessage: '이력서 원문 일부가 들어간 오류',
        } as SavePdfExtractionResultReqDTO);

        expect(logError).toHaveBeenCalledWith('PDF extraction failed: correctionId=10');
        expect(JSON.stringify(logError.mock.calls)).not.toContain('이력서 원문');
        expect(JSON.stringify(logDebug.mock.calls)).toContain('이력서 원문');
        expect(reportCorrectionAiPdfFailure).toHaveBeenCalledWith(10, 3);
        expect(corrections.updatePdfExtractionStatus).toHaveBeenCalledWith(
            10,
            PdfExtractionStatus.FAILED
        );
    });
});
