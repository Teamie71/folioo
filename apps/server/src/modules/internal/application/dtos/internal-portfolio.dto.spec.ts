import { BusinessException } from 'src/common/exceptions/business.exception';
import { InternalPortfolioDetailResDTO } from './internal-portfolio.dto';
import { PortfolioStatus } from 'src/modules/portfolio/domain/enums/portfolio-status.enum';

describe('InternalPortfolioDetailResDTO', () => {
    const basePortfolio = {
        id: 1,
        name: '외부 포트폴리오 이름',
        status: PortfolioStatus.COMPLETED,
        description: 'desc',
        responsibilities: 'resp',
        problemSolving: 'prob',
        learnings: 'learn',
        contributionRate: null,
        user: { id: 7 },
    };

    it('maps internal portfolio experience name when experience exists', () => {
        const dto = InternalPortfolioDetailResDTO.from({
            ...basePortfolio,
            experience: { name: '내부 경험명', sessionId: 'session-1' },
        } as never);

        expect(dto.experienceName).toBe('내부 경험명');
        expect(dto.sessionId).toBe('session-1');
    });

    it('maps external portfolio name when experience is missing', () => {
        const dto = InternalPortfolioDetailResDTO.from({
            ...basePortfolio,
            experience: null,
        } as never);

        expect(dto.experienceName).toBe('외부 포트폴리오 이름');
        expect(dto.sessionId).toBeNull();
    });

    it('throws when user relation is missing', () => {
        expect(() =>
            InternalPortfolioDetailResDTO.from({
                ...basePortfolio,
                user: null,
                experience: null,
            } as never)
        ).toThrow(BusinessException);
    });
});
