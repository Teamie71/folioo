import { calculateTraitVector } from './trait-vector.calculator';
import { TraitKind } from '../../domain/enums/trait-kind.enum';
import { TraitAnswer } from '../../domain/types';

const buildAnswers = (value: number): TraitAnswer[] =>
    Array.from({ length: 15 }, (_, i) => ({ questionNo: i + 1, value }));

describe('calculateTraitVector', () => {
    it('averages 2 direct questions + 1 tradeoff contribution per trait (hand-computed case)', () => {
        // 1~12: INVESTIGATIVE=문항1,2 등. 전부 3으로 응답.
        // 13~15: 전부 "그렇다 -2"(value=3) -> TRADEOFF_SCORE_TABLE[3] = [3.5, 2.5]
        const answers = buildAnswers(3);
        const vector = calculateTraitVector(answers);

        // ENTERPRISING(13번 좌측): (3+3+3.5)/3, INVESTIGATIVE(13번 우측): (3+3+2.5)/3
        expect(vector[TraitKind.ENTERPRISING]).toBeCloseTo((3 + 3 + 3.5) / 3, 5);
        expect(vector[TraitKind.INVESTIGATIVE]).toBeCloseTo((3 + 3 + 2.5) / 3, 5);
        // REALISTIC(14번 좌측), SOCIAL(14번 우측)
        expect(vector[TraitKind.REALISTIC]).toBeCloseTo((3 + 3 + 3.5) / 3, 5);
        expect(vector[TraitKind.SOCIAL]).toBeCloseTo((3 + 3 + 2.5) / 3, 5);
        // ARTISTIC(15번 좌측), CONVENTIONAL(15번 우측)
        expect(vector[TraitKind.ARTISTIC]).toBeCloseTo((3 + 3 + 3.5) / 3, 5);
        expect(vector[TraitKind.CONVENTIONAL]).toBeCloseTo((3 + 3 + 2.5) / 3, 5);
    });

    it('stays within the mathematically reachable range for the max-value answer set', () => {
        // 전 문항 6("그렇지 않다") 응답. TRADEOFF_SCORE_TABLE[6] = [0.5, 5.5]라
        // 좌측 특성(추진/현장/창작)은 (6+6+0.5)/3, 우측 특성(탐구/공감/체계)은 (6+6+5.5)/3이
        // 된다 — 트레이드오프 배점표 자체가 0.5~5.5 범위라 척도 상한(6)에 정확히
        // 도달하지는 않는다. 상/하한 근접치를 정확한 계산값으로 검증한다.
        const vector = calculateTraitVector(buildAnswers(6));

        expect(vector[TraitKind.ENTERPRISING]).toBeCloseTo((6 + 6 + 0.5) / 3, 5);
        expect(vector[TraitKind.INVESTIGATIVE]).toBeCloseTo((6 + 6 + 5.5) / 3, 5);
        expect(vector[TraitKind.REALISTIC]).toBeCloseTo((6 + 6 + 0.5) / 3, 5);
        expect(vector[TraitKind.SOCIAL]).toBeCloseTo((6 + 6 + 5.5) / 3, 5);
        expect(vector[TraitKind.ARTISTIC]).toBeCloseTo((6 + 6 + 0.5) / 3, 5);
        expect(vector[TraitKind.CONVENTIONAL]).toBeCloseTo((6 + 6 + 5.5) / 3, 5);
    });

    it('stays within the mathematically reachable range for the min-value answer set', () => {
        const vector = calculateTraitVector(buildAnswers(1));

        expect(vector[TraitKind.ENTERPRISING]).toBeCloseTo((1 + 1 + 5.5) / 3, 5);
        expect(vector[TraitKind.INVESTIGATIVE]).toBeCloseTo((1 + 1 + 0.5) / 3, 5);
    });

    it('applies each of the 6 tradeoff answer levels exactly as scored in the table', () => {
        for (let value = 1; value <= 6; value++) {
            const answers = buildAnswers(3);
            answers[12] = { questionNo: 13, value }; // Q13: ENTERPRISING <-> INVESTIGATIVE
            const vector = calculateTraitVector(answers);
            const table: Record<number, [number, number]> = {
                1: [5.5, 0.5],
                2: [4.5, 1.5],
                3: [3.5, 2.5],
                4: [2.5, 3.5],
                5: [1.5, 4.5],
                6: [0.5, 5.5],
            };
            const [leftScore, rightScore] = table[value];
            expect(vector[TraitKind.ENTERPRISING]).toBeCloseTo((3 + 3 + leftScore) / 3, 5);
            expect(vector[TraitKind.INVESTIGATIVE]).toBeCloseTo((3 + 3 + rightScore) / 3, 5);
        }
    });

    it('throws when the answer count is not exactly 15', () => {
        expect(() => calculateTraitVector(buildAnswers(3).slice(0, 14))).toThrow();
    });

    it('throws when questionNo has duplicates', () => {
        const answers = buildAnswers(3);
        answers[1] = { questionNo: 1, value: 3 }; // duplicate of questionNo 1
        expect(() => calculateTraitVector(answers)).toThrow();
    });

    it('throws when a value is out of the configured scale range', () => {
        const answers = buildAnswers(3);
        answers[0] = { questionNo: 1, value: 7 };
        expect(() => calculateTraitVector(answers)).toThrow();
    });
});
