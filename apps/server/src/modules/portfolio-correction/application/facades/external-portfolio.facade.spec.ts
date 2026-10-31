jest.mock('typeorm-transactional', () => ({
    Transactional: () => {
        return (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) =>
            descriptor;
    },
}));

import { ExternalPortfolioFacade } from './external-portfolio.facade';
import { ExternalPortfolioService } from 'src/modules/portfolio/application/services/external-portfolio.service';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import { PortfolioCorrectionService } from '../services/portfolio-correction.service';
import { CorrectionPortfolioSelectionService } from '../services/correction-portfolio-selection.service';
import { CorrectionItemService } from '../services/correction-item.service';
import { PdfExtractService } from '../services/pdf-extract.service';
import { PdfExtractionStatus } from '../../domain/enums/pdf-extraction-status.enum';

class ExternalPortfolioServiceStub {
    readonly deleteExternalPortfolio = jest.fn<Promise<void>, [number, number]>();
}

class PortfolioServiceStub {
    readonly findByIdsAndUserIdOrThrow = jest.fn<Promise<unknown[]>, [number[], number]>();
    readonly findByIds = jest.fn<Promise<unknown[]>, [number[]]>();
}

class PortfolioCorrectionServiceStub {
    readonly findByIdAndUserIdOrThrow = jest.fn<
        Promise<{ pdfExtractionStatus: PdfExtractionStatus; originalFileName: string | null }>,
        [number, number]
    >();
    readonly updatePdfExtractionStatus = jest.fn<Promise<void>, [number, PdfExtractionStatus]>();
    readonly updateOriginalFileName = jest.fn<Promise<void>, [number, string]>();
}

class CorrectionPortfolioSelectionServiceStub {
    readonly deleteByPortfolioId = jest.fn<Promise<void>, [number]>();
    readonly findActivePortfolioIdsByCorrectionId = jest.fn<Promise<number[]>, [number]>();
}

class CorrectionItemServiceStub {
    readonly deleteByPortfolioId = jest.fn<Promise<void>, [number]>();
}

class PdfExtractServiceStub {
    readonly extractText = jest.fn<Promise<{ message: string }>, [number, Buffer, string]>();
}

describe('ExternalPortfolioFacade', () => {
    let externalPortfolioFacade: ExternalPortfolioFacade;
    let externalPortfolioServiceStub: ExternalPortfolioServiceStub;
    let portfolioServiceStub: PortfolioServiceStub;
    let portfolioCorrectionServiceStub: PortfolioCorrectionServiceStub;
    let correctionPortfolioSelectionServiceStub: CorrectionPortfolioSelectionServiceStub;
    let correctionItemServiceStub: CorrectionItemServiceStub;
    let pdfExtractServiceStub: PdfExtractServiceStub;

    beforeEach(() => {
        externalPortfolioServiceStub = new ExternalPortfolioServiceStub();
        portfolioServiceStub = new PortfolioServiceStub();
        portfolioCorrectionServiceStub = new PortfolioCorrectionServiceStub();
        correctionPortfolioSelectionServiceStub = new CorrectionPortfolioSelectionServiceStub();
        correctionItemServiceStub = new CorrectionItemServiceStub();
        pdfExtractServiceStub = new PdfExtractServiceStub();

        externalPortfolioFacade = new ExternalPortfolioFacade(
            externalPortfolioServiceStub as unknown as ExternalPortfolioService,
            portfolioServiceStub as unknown as PortfolioService,
            portfolioCorrectionServiceStub as unknown as PortfolioCorrectionService,
            correctionPortfolioSelectionServiceStub as unknown as CorrectionPortfolioSelectionService,
            correctionItemServiceStub as unknown as CorrectionItemService,
            pdfExtractServiceStub as unknown as PdfExtractService
        );
    });

    it('stores original file name when extraction is accepted', async () => {
        portfolioCorrectionServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue({
            pdfExtractionStatus: PdfExtractionStatus.NONE,
            originalFileName: null,
        });
        pdfExtractServiceStub.extractText.mockResolvedValue({
            message: 'ok',
        });

        const result = await externalPortfolioFacade.extractPortfolio(
            9,
            1,
            Buffer.from('pdf'),
            'resume.pdf'
        );

        expect(result).toBe('ok');
        expect(portfolioCorrectionServiceStub.updatePdfExtractionStatus).toHaveBeenCalledWith(
            1,
            PdfExtractionStatus.GENERATING
        );
        expect(portfolioCorrectionServiceStub.updateOriginalFileName).toHaveBeenCalledWith(
            1,
            'resume.pdf'
        );
    });

    it('returns top-level pdf extraction status with portfolios list', async () => {
        portfolioCorrectionServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue({
            pdfExtractionStatus: PdfExtractionStatus.GENERATING,
            originalFileName: 'portfolio.pdf',
        });
        correctionPortfolioSelectionServiceStub.findActivePortfolioIdsByCorrectionId.mockResolvedValue(
            [10, 20]
        );
        portfolioServiceStub.findByIds.mockResolvedValue([
            {
                id: 10,
                name: 'A',
                description: 'D1',
                responsibilities: 'R1',
                problemSolving: 'P1',
                learnings: 'L1',
            },
            {
                id: 20,
                name: 'B',
                description: 'D2',
                responsibilities: 'R2',
                problemSolving: 'P2',
                learnings: 'L2',
            },
        ]);

        const result = await externalPortfolioFacade.getSelectedPortfolios(1, 9);

        expect(result.status).toBe(PdfExtractionStatus.GENERATING);
        expect(result.originalFileName).toBe('portfolio.pdf');
        expect(result.portfolios).toEqual([
            {
                portfolioId: 10,
                name: 'A',
                description: 'D1',
                responsibilities: 'R1',
                problemSolving: 'P1',
                learnings: 'L1',
            },
            {
                portfolioId: 20,
                name: 'B',
                description: 'D2',
                responsibilities: 'R2',
                problemSolving: 'P2',
                learnings: 'L2',
            },
        ]);
    });

    it('normalizes legacy mojibake original file name on get response', async () => {
        portfolioCorrectionServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue({
            pdfExtractionStatus: PdfExtractionStatus.GENERATING,
            originalFileName: 'Ã¬Â²Â¨Ã¬ÂÂ­_Ã¬ÂÂ´Ã«Â Â¥Ã¬ÂÂ.pdf',
        });
        correctionPortfolioSelectionServiceStub.findActivePortfolioIdsByCorrectionId.mockResolvedValue(
            []
        );

        const result = await externalPortfolioFacade.getSelectedPortfolios(1, 9);

        expect(result.originalFileName).toBe('첨삭_이력서.pdf');
        expect(result.portfolios).toEqual([]);
    });

    it('normalizes NFD original file name to NFC on get response', async () => {
        const nfcName = '첨삭_이력서.pdf';
        const nfdName = nfcName.normalize('NFD');
        portfolioCorrectionServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue({
            pdfExtractionStatus: PdfExtractionStatus.GENERATING,
            originalFileName: nfdName,
        });
        correctionPortfolioSelectionServiceStub.findActivePortfolioIdsByCorrectionId.mockResolvedValue(
            []
        );

        const result = await externalPortfolioFacade.getSelectedPortfolios(1, 9);

        expect(result.originalFileName).toBe(nfcName);
        expect(result.originalFileName?.normalize('NFC')).toBe(result.originalFileName);
        expect(result.originalFileName).not.toBe(nfdName);
    });

    it('sanitizes directory and control characters on get response', async () => {
        portfolioCorrectionServiceStub.findByIdAndUserIdOrThrow.mockResolvedValue({
            pdfExtractionStatus: PdfExtractionStatus.GENERATING,
            originalFileName: 'C:\\fakepath\\folioo\u0000-report.pdf',
        });
        correctionPortfolioSelectionServiceStub.findActivePortfolioIdsByCorrectionId.mockResolvedValue(
            []
        );

        const result = await externalPortfolioFacade.getSelectedPortfolios(1, 9);

        expect(result.originalFileName).toBe('folioo-report.pdf');
    });

    it('validates ownership first, then deletes related links and portfolio', async () => {
        portfolioServiceStub.findByIdsAndUserIdOrThrow.mockResolvedValue([{}]);
        correctionItemServiceStub.deleteByPortfolioId.mockResolvedValue();
        correctionPortfolioSelectionServiceStub.deleteByPortfolioId.mockResolvedValue();
        externalPortfolioServiceStub.deleteExternalPortfolio.mockResolvedValue();

        await externalPortfolioFacade.deleteExternalPortfolio(55, 9);

        expect(portfolioServiceStub.findByIdsAndUserIdOrThrow).toHaveBeenCalledWith([55], 9);
        expect(correctionItemServiceStub.deleteByPortfolioId).toHaveBeenCalledWith(55);
        expect(correctionPortfolioSelectionServiceStub.deleteByPortfolioId).toHaveBeenCalledWith(
            55
        );
        expect(externalPortfolioServiceStub.deleteExternalPortfolio).toHaveBeenCalledWith(55, 9);

        const validateOrder =
            portfolioServiceStub.findByIdsAndUserIdOrThrow.mock.invocationCallOrder[0];
        const itemDeleteOrder =
            correctionItemServiceStub.deleteByPortfolioId.mock.invocationCallOrder[0];
        const selectionDeleteOrder =
            correctionPortfolioSelectionServiceStub.deleteByPortfolioId.mock.invocationCallOrder[0];
        const portfolioDeleteOrder =
            externalPortfolioServiceStub.deleteExternalPortfolio.mock.invocationCallOrder[0];

        expect(validateOrder).toBeLessThan(itemDeleteOrder);
        expect(validateOrder).toBeLessThan(selectionDeleteOrder);
        expect(selectionDeleteOrder).toBeLessThan(portfolioDeleteOrder);
        expect(itemDeleteOrder).toBeLessThan(portfolioDeleteOrder);
    });

    it('does not delete related data when ownership validation fails', async () => {
        const validationError = new Error('validation failed');
        portfolioServiceStub.findByIdsAndUserIdOrThrow.mockRejectedValue(validationError);

        await expect(externalPortfolioFacade.deleteExternalPortfolio(55, 9)).rejects.toThrow(
            validationError
        );

        expect(correctionItemServiceStub.deleteByPortfolioId).not.toHaveBeenCalled();
        expect(correctionPortfolioSelectionServiceStub.deleteByPortfolioId).not.toHaveBeenCalled();
        expect(externalPortfolioServiceStub.deleteExternalPortfolio).not.toHaveBeenCalled();
    });
});
