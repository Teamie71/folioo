import { PortfolioCorrection } from './portfolio-correction.entity';
import { JobDescriptionType } from './enums/jobdescription-type.enum';

describe('PortfolioCorrection', () => {
    it('요청된 제목을 그대로 저장한다', () => {
        const correction = PortfolioCorrection.create(
            1,
            'Backend Resume',
            'Folioo',
            'Backend Developer',
            'JD',
            JobDescriptionType.TEXT
        );

        expect(correction.title).toBe('Backend Resume');
    });
});
