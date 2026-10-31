import { ValueKind } from '../../domain/enums/value-kind.enum';
import { ValueVector } from '../../domain/types';
import { CompanyTypeScoringInput, scoreCompanyTypes } from './company-type.calculator';

const { WORK_LIFE_BALANCE, REWARD, STABILITY, NAME_VALUE, GROWTH } = ValueKind;
const ROC_WEIGHTS = [137 / 300, 77 / 300, 47 / 300, 27 / 300, 12 / 300];

const zeroValues = (): ValueVector => ({
    [WORK_LIFE_BALANCE]: 0,
    [REWARD]: 0,
    [STABILITY]: 0,
    [NAME_VALUE]: 0,
    [GROWTH]: 0,
});

const companyType = (
    code: string,
    values: ValueVector,
    description = ''
): CompanyTypeScoringInput => ({
    code,
    name: code,
    values,
    description,
    tip: null,
});

describe('scoreCompanyTypes', () => {
    it('computes matchRate as the dot product of user weights and company scores, ×100', () => {
        const userWeights: ValueVector = {
            ...zeroValues(),
            [WORK_LIFE_BALANCE]: ROC_WEIGHTS[0],
            [REWARD]: ROC_WEIGHTS[1],
            [STABILITY]: ROC_WEIGHTS[2],
            [NAME_VALUE]: ROC_WEIGHTS[3],
            [GROWTH]: ROC_WEIGHTS[4],
        };
        const values: ValueVector = {
            [WORK_LIFE_BALANCE]: 0.5,
            [REWARD]: 1,
            [STABILITY]: 0.75,
            [NAME_VALUE]: 1,
            [GROWTH]: 0.25,
        };
        const expected =
            ROC_WEIGHTS[0] * 0.5 +
            ROC_WEIGHTS[1] * 1 +
            ROC_WEIGHTS[2] * 0.75 +
            ROC_WEIGHTS[3] * 1 +
            ROC_WEIGHTS[4] * 0.25;

        const result = scoreCompanyTypes([companyType('LARGE', values)], userWeights, 1);

        expect(result[0].matchRate).toBe(Math.round(expected * 100));
    });

    it('never exceeds 100 given ROC weights (convex combination) and [0,1]-bounded company scores', () => {
        // 이론상 최댓값: 가중치를 값이 큰 차원에 몰아줘도 합이 1인 convex combination이라
        // 전부 1인 벡터와 내적해도 1을 넘지 않는다.
        const userWeights: ValueVector = {
            ...zeroValues(),
            [WORK_LIFE_BALANCE]: ROC_WEIGHTS[0],
            [REWARD]: ROC_WEIGHTS[1],
            [STABILITY]: ROC_WEIGHTS[2],
            [NAME_VALUE]: ROC_WEIGHTS[3],
            [GROWTH]: ROC_WEIGHTS[4],
        };
        const allOnes: ValueVector = {
            [WORK_LIFE_BALANCE]: 1,
            [REWARD]: 1,
            [STABILITY]: 1,
            [NAME_VALUE]: 1,
            [GROWTH]: 1,
        };

        const result = scoreCompanyTypes([companyType('MAX', allOnes)], userWeights, 1);
        expect(result[0].matchRate).toBeLessThanOrEqual(100);
    });

    it('returns only the top N, descending by matchRate', () => {
        const userWeights: ValueVector = { ...zeroValues(), [WORK_LIFE_BALANCE]: 1 };
        const companyTypes = [
            companyType('LOW', { ...zeroValues(), [WORK_LIFE_BALANCE]: 0.1 }),
            companyType('HIGH', { ...zeroValues(), [WORK_LIFE_BALANCE]: 0.9 }),
        ];

        const result = scoreCompanyTypes(companyTypes, userWeights, 1);

        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('HIGH');
    });

    it('breaks ties deterministically by code ascending', () => {
        const userWeights: ValueVector = { ...zeroValues(), [WORK_LIFE_BALANCE]: 1 };
        const companyTypes = [
            companyType('ZEBRA', { ...zeroValues(), [WORK_LIFE_BALANCE]: 0.5 }),
            companyType('ALPHA', { ...zeroValues(), [WORK_LIFE_BALANCE]: 0.5 }),
        ];

        const result = scoreCompanyTypes(companyTypes, userWeights, 2);
        expect(result.map((r) => r.code)).toEqual(['ALPHA', 'ZEBRA']);
    });
});
