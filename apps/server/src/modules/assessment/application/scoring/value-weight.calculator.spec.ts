import { ValueKind } from '../../domain/enums/value-kind.enum';
import { calculateValueWeights } from './value-weight.calculator';

const { WORK_LIFE_BALANCE, REWARD, STABILITY, NAME_VALUE, GROWTH } = ValueKind;
const ROC_WEIGHTS = [137 / 300, 77 / 300, 47 / 300, 27 / 300, 12 / 300];

describe('calculateValueWeights', () => {
    it('assigns ROC weights in rank order', () => {
        const ranking = [WORK_LIFE_BALANCE, REWARD, STABILITY, NAME_VALUE, GROWTH];
        const weights = calculateValueWeights(ranking, ROC_WEIGHTS);

        expect(weights[WORK_LIFE_BALANCE]).toBeCloseTo(ROC_WEIGHTS[0], 6);
        expect(weights[REWARD]).toBeCloseTo(ROC_WEIGHTS[1], 6);
        expect(weights[STABILITY]).toBeCloseTo(ROC_WEIGHTS[2], 6);
        expect(weights[NAME_VALUE]).toBeCloseTo(ROC_WEIGHTS[3], 6);
        expect(weights[GROWTH]).toBeCloseTo(ROC_WEIGHTS[4], 6);
    });

    it('sums to 1 within floating point tolerance', () => {
        const weights = calculateValueWeights(
            [REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE],
            ROC_WEIGHTS
        );
        const sum = Object.values(weights).reduce((acc, w) => acc + (w ?? 0), 0);
        expect(sum).toBeCloseTo(1, 6);
    });

    it('reflects a different ranking order correctly', () => {
        const weights = calculateValueWeights(
            [GROWTH, NAME_VALUE, STABILITY, REWARD, WORK_LIFE_BALANCE],
            ROC_WEIGHTS
        );
        expect(weights[GROWTH]).toBeCloseTo(ROC_WEIGHTS[0], 6);
        expect(weights[WORK_LIFE_BALANCE]).toBeCloseTo(ROC_WEIGHTS[4], 6);
    });

    it('throws when the ranking does not have exactly 5 elements', () => {
        expect(() => calculateValueWeights([WORK_LIFE_BALANCE, REWARD], ROC_WEIGHTS)).toThrow();
    });

    it('throws when the ranking has duplicates', () => {
        expect(() =>
            calculateValueWeights(
                [WORK_LIFE_BALANCE, WORK_LIFE_BALANCE, STABILITY, NAME_VALUE, GROWTH],
                ROC_WEIGHTS
            )
        ).toThrow();
    });
});
