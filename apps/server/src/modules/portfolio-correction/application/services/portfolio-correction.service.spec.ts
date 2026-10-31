import { BusinessException } from 'src/common/exceptions/business.exception';
import { AiRelayPort, AiRelayJsonResponse } from 'src/common/ports/ai-relay.port';
import { PortfolioCorrectionFacade } from '../facades/portfolio-correction.facade';
import { PortfolioCorrectionService } from './portfolio-correction.service';
import { CorrectionStatus } from '../../domain/enums/correction-status.enum';
import { CorrectionItem } from '../../domain/correction-item.entity';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { JobDescriptionType } from '../../domain/enums/jobdescription-type.enum';
import { AiRelayGetRequest, AiRelayRequest } from 'src/common/ports/ai-relay.port';

type CorrectionOverrides = Partial<
    Omit<PortfolioCorrection, 'companyInsight' | 'highlightPoint'>
> & {
    companyInsight?: string | null;
    highlightPoint?: string | null;
};

const createCorrection = (overrides: CorrectionOverrides = {}): PortfolioCorrection => {
    const correction = new PortfolioCorrection();
    correction.id = overrides.id ?? 1;
    correction.title = overrides.title ?? 'Correction';
    correction.companyName = overrides.companyName ?? 'Folioo';
    correction.positionName = overrides.positionName ?? 'Backend Developer';
    correction.jobDescription = overrides.jobDescription ?? 'Build APIs';
    correction.jobDescriptionType = overrides.jobDescriptionType ?? JobDescriptionType.TEXT;
    correction.status = overrides.status ?? CorrectionStatus.NOT_STARTED;
    correction.companyInsight = (overrides.companyInsight ?? null) as unknown as string;
    correction.highlightPoint = (overrides.highlightPoint ?? null) as unknown as string;
    correction.createdAt = overrides.createdAt ?? new Date('2026-03-08T00:00:00.000Z');
    correction.updatedAt = overrides.updatedAt ?? new Date('2026-03-08T00:00:00.000Z');
    correction.user = overrides.user ?? ({ id: 7 } as PortfolioCorrection['user']);
    return correction;
};

const createCorrectionItem = (portfolioId: number): CorrectionItem => {
    const item = new CorrectionItem();
    item.portfolio = { id: portfolioId } as CorrectionItem['portfolio'];
    item.description = null as unknown as Record<string, unknown>;
    item.responsibilities = null as unknown as Record<string, unknown>;
    item.problemSolving = null as unknown as Record<string, unknown>;
    item.learnings = null as unknown as Record<string, unknown>;

    return item;
};

class AiRelayPortStub extends AiRelayPort {
    readonly postJsonMock = jest.fn<Promise<AiRelayJsonResponse>, [AiRelayRequest]>();

    getJson<T = unknown>(request: AiRelayGetRequest): Promise<AiRelayJsonResponse<T>> {
        void request;
        throw new Error('Not implemented');
    }

    postJson<T = unknown>(request: AiRelayRequest): Promise<AiRelayJsonResponse<T>> {
        return this.postJsonMock(request) as Promise<AiRelayJsonResponse<T>>;
    }
}

describe('PortfolioCorrectionService', () => {
    let repository: {
        findByIdAndUserId: ReturnType<
            typeof jest.fn<Promise<PortfolioCorrection | null>, [number, number]>
        >;
        save: ReturnType<typeof jest.fn<Promise<PortfolioCorrection>, [PortfolioCorrection]>>;
        findById: ReturnType<typeof jest.fn<Promise<PortfolioCorrection | null>, [number]>>;
        findByIdWithUser: ReturnType<typeof jest.fn<Promise<PortfolioCorrection | null>, [number]>>;
        updateById: ReturnType<
            typeof jest.fn<Promise<void>, [number, Partial<PortfolioCorrection>]>
        >;
    };
    let correctionItemService: {
        findByCorrectionId: ReturnType<typeof jest.fn<Promise<CorrectionItem[]>, [number]>>;
        saveAll: ReturnType<typeof jest.fn<Promise<CorrectionItem[]>, [CorrectionItem[]]>>;
    };
    let service: PortfolioCorrectionService;
    let correctionPortfolioSelectionService: {
        findActivePortfolioIdsByCorrectionId: ReturnType<
            typeof jest.fn<Promise<number[]>, [number]>
        >;
    };

    beforeEach(() => {
        repository = {
            findByIdAndUserId: jest.fn<Promise<PortfolioCorrection | null>, [number, number]>(),
            save: jest.fn<Promise<PortfolioCorrection>, [PortfolioCorrection]>(),
            findById: jest.fn<Promise<PortfolioCorrection | null>, [number]>(),
            findByIdWithUser: jest.fn<Promise<PortfolioCorrection | null>, [number]>(),
            updateById: jest.fn<Promise<void>, [number, Partial<PortfolioCorrection>]>(),
        };
        correctionItemService = {
            findByCorrectionId: jest.fn<Promise<CorrectionItem[]>, [number]>(),
            saveAll: jest.fn<Promise<CorrectionItem[]>, [CorrectionItem[]]>(),
        };
        correctionPortfolioSelectionService = {
            findActivePortfolioIdsByCorrectionId: jest.fn<Promise<number[]>, [number]>(),
        };

        service = new PortfolioCorrectionService(
            repository as unknown as never,
            correctionItemService as unknown as never,
            correctionPortfolioSelectionService as unknown as never
        );
    });

    it('returns company insight response with status when company insight is still null', async () => {
        repository.findByIdAndUserId.mockResolvedValue(createCorrection({ companyInsight: null }));

        await expect(service.getCompanyInsight(1, 7)).resolves.toMatchObject({
            id: 1,
            status: CorrectionStatus.NOT_STARTED,
            companyInsight: null,
            highlightPoint: null,
        });
    });

    it('moves status to DOING_RAG before company insight generation starts', async () => {
        const correction = createCorrection({ status: CorrectionStatus.NOT_STARTED });
        repository.findByIdAndUserId.mockResolvedValue(correction);
        repository.save.mockImplementation((saved) => Promise.resolve(saved));

        await expect(service.requestCompanyInsightCreation(1, 7)).resolves.toBe(true);
        expect(correction.status).toBe(CorrectionStatus.DOING_RAG);
        expect(repository.save).toHaveBeenCalledWith(correction);
    });

    it('does not re-save when company insight generation is already in progress', async () => {
        repository.findByIdAndUserId.mockResolvedValue(
            createCorrection({ status: CorrectionStatus.DOING_RAG })
        );

        await expect(service.requestCompanyInsightCreation(1, 7)).resolves.toBe(false);
        expect(repository.save).not.toHaveBeenCalled();
    });

    it('allows idempotent status updates from AI callbacks', async () => {
        repository.findById.mockResolvedValue(
            createCorrection({ status: CorrectionStatus.GENERATING })
        );

        await expect(
            service.updateStatusWithTransition(1, CorrectionStatus.GENERATING)
        ).resolves.toBeUndefined();

        expect(repository.updateById).toHaveBeenCalledWith(1, {
            status: CorrectionStatus.GENERATING,
        });
    });

    it('requires COMPANY_INSIGHT before transitioning to GENERATING', async () => {
        repository.findById.mockResolvedValue(
            createCorrection({ status: CorrectionStatus.NOT_STARTED })
        );

        await expect(service.transitionToGenerating(1)).rejects.toThrow(BusinessException);
        expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('allows retry transition from FAILED to GENERATING', async () => {
        repository.findById.mockResolvedValue(
            createCorrection({ status: CorrectionStatus.FAILED })
        );

        await expect(service.transitionToGenerating(1)).resolves.toBeUndefined();

        expect(repository.updateById).toHaveBeenCalledWith(1, {
            status: CorrectionStatus.GENERATING,
        });
    });

    it('rejects correction results when not all selected portfolio items are returned', async () => {
        repository.findById.mockResolvedValue(
            createCorrection({ status: CorrectionStatus.GENERATING })
        );
        correctionItemService.findByCorrectionId.mockResolvedValue([
            createCorrectionItem(10),
            createCorrectionItem(11),
        ]);

        await expect(
            service.saveCorrectionResult(1, [{ portfolioId: 10, data: {} }], '전체 총평')
        ).rejects.toThrow(BusinessException);

        expect(correctionItemService.saveAll).not.toHaveBeenCalled();
        expect(repository.updateById).not.toHaveBeenCalledWith(1, {
            status: CorrectionStatus.DONE,
        });
    });

    it('saves all matched correction results and then marks DONE', async () => {
        repository.findById.mockResolvedValue(
            createCorrection({ status: CorrectionStatus.GENERATING })
        );
        const first = createCorrectionItem(10);
        const second = createCorrectionItem(11);
        correctionItemService.findByCorrectionId.mockResolvedValue([first, second]);
        correctionItemService.saveAll.mockImplementation((items) => Promise.resolve(items));

        await expect(
            service.saveCorrectionResult(
                1,
                [
                    { portfolioId: 10, data: {} },
                    { portfolioId: 11, data: {} },
                ],
                '전체 포트폴리오 총평'
            )
        ).resolves.toBeUndefined();

        expect(correctionItemService.saveAll).toHaveBeenCalledWith([first, second]);
        expect(repository.updateById).toHaveBeenCalledWith(1, {
            status: CorrectionStatus.DONE,
            overallReview: '전체 포트폴리오 총평',
        });
    });

    it('returns correction detail payload with selected portfolios and items', async () => {
        repository.findByIdWithUser.mockResolvedValue(createCorrection({ id: 1 }));
        correctionPortfolioSelectionService.findActivePortfolioIdsByCorrectionId.mockResolvedValue([
            10, 11,
        ]);
        const internalItem = createCorrectionItem(10);
        const externalItem = createCorrectionItem(11);
        correctionItemService.findByCorrectionId.mockResolvedValue([internalItem, externalItem]);

        const payload = await service.getInternalCorrectionDetail(1);

        expect(payload.portfolioIds).toEqual([10, 11]);
        expect(payload.items).toHaveLength(2);
    });

    it('accepts scoped correction result updates using expected portfolio ids', async () => {
        repository.findById.mockResolvedValue(
            createCorrection({ status: CorrectionStatus.GENERATING })
        );
        const first = createCorrectionItem(10);
        const second = createCorrectionItem(11);
        correctionItemService.findByCorrectionId.mockResolvedValue([first, second]);
        correctionItemService.saveAll.mockImplementation((items) => Promise.resolve(items));

        await expect(
            service.saveCorrectionResult(1, [{ portfolioId: 10, data: {} }], '부분 총평', [10])
        ).resolves.toBeUndefined();

        expect(correctionItemService.saveAll).toHaveBeenCalledWith([first]);
        expect(repository.updateById).toHaveBeenCalledWith(1, {
            status: CorrectionStatus.DONE,
            overallReview: '부분 총평',
        });
    });
});

describe('PortfolioCorrectionFacade', () => {
    let facade: PortfolioCorrectionFacade;
    let portfolioCorrectionService: {
        requestCompanyInsightCreation: ReturnType<
            typeof jest.fn<Promise<boolean>, [number, number]>
        >;
    };
    let aiRelayPort: AiRelayPortStub;

    beforeEach(() => {
        portfolioCorrectionService = {
            requestCompanyInsightCreation: jest.fn<Promise<boolean>, [number, number]>(),
        };
        aiRelayPort = new AiRelayPortStub();
        aiRelayPort.postJsonMock.mockResolvedValue({ data: {}, status: 202, headers: {} });

        facade = new PortfolioCorrectionFacade(
            portfolioCorrectionService as unknown as never,
            {} as never,
            {} as never,
            {} as never,
            aiRelayPort
        );
    });

    it('delegates company insight creation to the AI rag endpoint', async () => {
        portfolioCorrectionService.requestCompanyInsightCreation.mockResolvedValue(true);

        await facade.requestCompanyInsightCreation(3, 7);

        expect(aiRelayPort.postJsonMock).toHaveBeenCalledWith({
            path: '/api/v1/corrections/3/rag',
            body: {},
        });
    });

    it('skips AI delegation when company insight generation is already running', async () => {
        portfolioCorrectionService.requestCompanyInsightCreation.mockResolvedValue(false);

        await facade.requestCompanyInsightCreation(3, 7);

        expect(aiRelayPort.postJsonMock).not.toHaveBeenCalled();
    });
});
