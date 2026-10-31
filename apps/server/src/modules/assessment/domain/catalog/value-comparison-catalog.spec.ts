import { ALL_VALUE_KINDS, ValueKind } from '../enums/value-kind.enum';
import { getComparisonCard } from './value-comparison-catalog';

describe('getComparisonCard', () => {
    it('returns every one of the 10 possible pairs regardless of argument order', () => {
        for (let i = 0; i < ALL_VALUE_KINDS.length; i++) {
            for (let j = i + 1; j < ALL_VALUE_KINDS.length; j++) {
                const a = ALL_VALUE_KINDS[i];
                const b = ALL_VALUE_KINDS[j];
                const forward = getComparisonCard(a, b);
                const backward = getComparisonCard(b, a);
                expect(forward).toEqual(backward);
                expect(new Set([forward.left, forward.right])).toEqual(new Set([a, b]));
                expect(forward.leftCard).toBeTruthy();
                expect(forward.rightCard).toBeTruthy();
            }
        }
    });

    it('always places REWARD on the left when compared against any other value', () => {
        for (const other of ALL_VALUE_KINDS) {
            if (other === ValueKind.REWARD) continue;
            const card = getComparisonCard(ValueKind.REWARD, other);
            expect(card.left).toBe(ValueKind.REWARD);
        }
    });

    it('always places WORK_LIFE_BALANCE on the right when compared against any other value', () => {
        for (const other of ALL_VALUE_KINDS) {
            if (other === ValueKind.WORK_LIFE_BALANCE) continue;
            const card = getComparisonCard(other, ValueKind.WORK_LIFE_BALANCE);
            expect(card.right).toBe(ValueKind.WORK_LIFE_BALANCE);
        }
    });
});
