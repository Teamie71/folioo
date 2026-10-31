import { ValueKind } from './enums/value-kind.enum';
import { ValueComparisonLogEntry } from './value-balance-session.entity';

export interface NextComparison {
    sequence: number;
    left: ValueKind;
    right: ValueKind;
}

export interface ReplayResult {
    sorted: ValueKind[];
    isComplete: boolean;
    next: NextComparison | null;
}

// 이진 삽입 정렬 재생: insertionOrder(도입 순서)와 log(지금까지의 비교 결과)만으로
// 현재 상태(확정된 순위, 완료 여부, 다음에 물어야 할 대결)를 매번 처음부터 다시 계산한다.
// 포인터를 별도로 저장하지 않는 이유는 "이전 응답 수정" 시 log를 자르고 다시 재생하기만 하면
// 되도록 하기 위함이다.
export function replay(insertionOrder: ValueKind[], log: ValueComparisonLogEntry[]): ReplayResult {
    if (insertionOrder.length === 0) {
        return { sorted: [], isComplete: true, next: null };
    }

    const sorted: ValueKind[] = [insertionOrder[0]];
    let logIndex = 0;

    for (let idx = 1; idx < insertionOrder.length; idx++) {
        const current = insertionOrder[idx];
        let lo = 0;
        let hi = sorted.length;

        while (lo < hi) {
            if (logIndex >= log.length) {
                return {
                    sorted,
                    isComplete: false,
                    next: {
                        sequence: logIndex,
                        left: current,
                        right: sorted[Math.floor((lo + hi) / 2)],
                    },
                };
            }

            const mid = Math.floor((lo + hi) / 2);
            const pivot = sorted[mid];
            const entry = log[logIndex];
            assertEntryMatchesPair(entry, current, pivot);

            if (entry.chosen === current) {
                hi = mid;
            } else {
                lo = mid + 1;
            }
            logIndex++;
        }

        sorted.splice(lo, 0, current);
    }

    return { sorted, isComplete: true, next: null };
}

function assertEntryMatchesPair(
    entry: ValueComparisonLogEntry,
    current: ValueKind,
    pivot: ValueKind
): void {
    const expected = new Set([current, pivot]);
    if (!expected.has(entry.left) || !expected.has(entry.right) || entry.left === entry.right) {
        throw new Error(
            `Answer log inconsistent with insertion state: expected pair (${current}, ${pivot}), got (${entry.left}, ${entry.right})`
        );
    }
}

// 1위=N점 ~ N위=1점, 합계(N*(N+1)/2)로 나눠 정규화. N=5면 1위=5/15=0.333...
export function computeWeights(ranking: ValueKind[]): Partial<Record<ValueKind, number>> {
    const n = ranking.length;
    const total = (n * (n + 1)) / 2;
    const weights: Partial<Record<ValueKind, number>> = {};
    ranking.forEach((value, index) => {
        const score = n - index;
        weights[value] = score / total;
    });
    return weights;
}
