import { ValueKind } from '../../domain/enums/value-kind.enum';
import { TraitKind } from '../../domain/enums/trait-kind.enum';
import { TraitVector } from '../../domain/types';
import { resolveTopTrait, resolveTopValue } from './headline.resolver';

const vector = (overrides: Partial<TraitVector>): TraitVector => ({
    [TraitKind.INVESTIGATIVE]: 0,
    [TraitKind.SOCIAL]: 0,
    [TraitKind.ENTERPRISING]: 0,
    [TraitKind.CONVENTIONAL]: 0,
    [TraitKind.REALISTIC]: 0,
    [TraitKind.ARTISTIC]: 0,
    ...overrides,
});

describe('resolveTopTrait', () => {
    it('picks the trait with the highest score', () => {
        const result = resolveTopTrait(vector({ [TraitKind.CONVENTIONAL]: 5.5 }));
        expect(result).toBe(TraitKind.CONVENTIONAL);
    });

    it('breaks ties deterministically by enum declaration order', () => {
        // INVESTIGATIVE와 SOCIAL이 동점이면 ALL_TRAIT_KINDS 선언순 먼저인 INVESTIGATIVE.
        const result = resolveTopTrait(
            vector({ [TraitKind.INVESTIGATIVE]: 4, [TraitKind.SOCIAL]: 4 })
        );
        expect(result).toBe(TraitKind.INVESTIGATIVE);
    });
});

describe('resolveTopValue', () => {
    it('returns the 1st-ranked value', () => {
        const ranking = [
            ValueKind.GROWTH,
            ValueKind.REWARD,
            ValueKind.STABILITY,
            ValueKind.NAME_VALUE,
            ValueKind.WORK_LIFE_BALANCE,
        ];
        expect(resolveTopValue(ranking)).toBe(ValueKind.GROWTH);
    });
});
