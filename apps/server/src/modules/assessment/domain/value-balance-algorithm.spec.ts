import { ValueKind } from './enums/value-kind.enum';
import { computeWeights, replay } from './value-balance-algorithm';
import { ValueComparisonLogEntry } from './value-balance-session.entity';

const { REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE } = ValueKind;

describe('replay', () => {
    it('returns an empty complete result for an empty insertion order', () => {
        expect(replay([], [])).toEqual({ sorted: [], isComplete: true, next: null });
    });

    it('places a single value without needing any comparison', () => {
        expect(replay([REWARD], [])).toEqual({
            sorted: [REWARD],
            isComplete: true,
            next: null,
        });
    });

    it('asks for the second value to be compared against the first when no answers exist yet', () => {
        const result = replay([REWARD, STABILITY], []);
        expect(result.isComplete).toBe(false);
        expect(result.next).toEqual({ sequence: 0, left: STABILITY, right: REWARD });
    });

    it('inserts the second value before the first when it is chosen over the pivot', () => {
        const log: ValueComparisonLogEntry[] = [
            { sequence: 0, left: STABILITY, right: REWARD, chosen: STABILITY },
        ];
        const result = replay([REWARD, STABILITY], log);
        expect(result).toEqual({ sorted: [STABILITY, REWARD], isComplete: true, next: null });
    });

    it('inserts the second value after the first when the pivot is chosen', () => {
        const log: ValueComparisonLogEntry[] = [
            { sequence: 0, left: STABILITY, right: REWARD, chosen: REWARD },
        ];
        const result = replay([REWARD, STABILITY], log);
        expect(result).toEqual({ sorted: [REWARD, STABILITY], isComplete: true, next: null });
    });

    it('fully ranks 5 values via binary insertion and matches a known total preference order', () => {
        // 실제 선호 순서(정답): REWARD > STABILITY > NAME_VALUE > GROWTH > WORK_LIFE_BALANCE
        const truePreference = [REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE];
        const prefers = (a: ValueKind, b: ValueKind): ValueKind =>
            truePreference.indexOf(a) < truePreference.indexOf(b) ? a : b;

        const insertionOrder = [WORK_LIFE_BALANCE, GROWTH, REWARD, NAME_VALUE, STABILITY];
        const log: ValueComparisonLogEntry[] = [];

        let state = replay(insertionOrder, log);
        let guard = 0;
        while (!state.isComplete) {
            guard++;
            expect(guard).toBeLessThanOrEqual(8); // 문서상 5개 값은 최대 8문항 소요
            const { sequence, left, right } = state.next!;
            log.push({ sequence, left, right, chosen: prefers(left, right) });
            state = replay(insertionOrder, log);
        }

        expect(state.sorted).toEqual(truePreference);
        expect(log.length).toBeGreaterThanOrEqual(5);
        expect(log.length).toBeLessThanOrEqual(8);
    });

    it('replays consistently after truncating the log to an earlier sequence (re-answer support)', () => {
        const insertionOrder = [REWARD, STABILITY, NAME_VALUE];
        // 1st comparison: STABILITY vs REWARD -> choose STABILITY => sorted becomes [STABILITY, REWARD]
        const firstLog: ValueComparisonLogEntry[] = [
            { sequence: 0, left: STABILITY, right: REWARD, chosen: STABILITY },
        ];
        const afterFirst = replay(insertionOrder, firstLog);
        expect(afterFirst.isComplete).toBe(false);
        expect(afterFirst.sorted).toEqual([STABILITY, REWARD]);

        // 되돌아가서 0번 질문 답을 반대로 바꾼다 (REWARD 선택) -> 그 뒤 로그는 폐기
        const revisedLog: ValueComparisonLogEntry[] = [
            { sequence: 0, left: STABILITY, right: REWARD, chosen: REWARD },
        ];
        const afterRevision = replay(insertionOrder, revisedLog);
        expect(afterRevision.sorted).toEqual([REWARD, STABILITY]);
        expect(afterRevision.isComplete).toBe(false);
    });

    it('throws when a log entry does not match the pair implied by the insertion state', () => {
        const insertionOrder = [REWARD, STABILITY];
        const inconsistentLog: ValueComparisonLogEntry[] = [
            { sequence: 0, left: NAME_VALUE, right: GROWTH, chosen: NAME_VALUE },
        ];
        expect(() => replay(insertionOrder, inconsistentLog)).toThrow();
    });
});

describe('computeWeights', () => {
    it('assigns 1st=N/total down to last=1/total, normalized to sum to 1', () => {
        const ranking = [WORK_LIFE_BALANCE, GROWTH, STABILITY, REWARD, NAME_VALUE];
        const weights = computeWeights(ranking);

        expect(weights[WORK_LIFE_BALANCE]).toBeCloseTo(5 / 15, 5);
        expect(weights[GROWTH]).toBeCloseTo(4 / 15, 5);
        expect(weights[STABILITY]).toBeCloseTo(3 / 15, 5);
        expect(weights[REWARD]).toBeCloseTo(2 / 15, 5);
        expect(weights[NAME_VALUE]).toBeCloseTo(1 / 15, 5);

        const sum = Object.values(weights).reduce((acc, w) => acc + (w ?? 0), 0);
        expect(sum).toBeCloseTo(1, 5);
    });
});
