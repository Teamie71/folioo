import { ValueKind, ALL_VALUE_KINDS } from '../../domain/enums/value-kind.enum';
import { ValueVector } from '../../domain/types';

// 순수 함수: 확정된 가치관 순위(1위..5위) -> ROC 가중치 벡터(합계 1).
// 밸런스게임 진행 로직은 이 함수의 범위 밖이다 — 서버는 확정된 순위 배열만 입력받는다.
// rocWeights는 룰셋(ruleset_versions.roc_weights)에서 조회한 값을 호출부가 넘긴다.
export function calculateValueWeights(
    ranking: readonly ValueKind[],
    rocWeights: readonly number[]
): ValueVector {
    assertValidRanking(ranking);

    const vector = {} as ValueVector;
    ranking.forEach((value, index) => {
        vector[value] = rocWeights[index];
    });
    return vector;
}

function assertValidRanking(ranking: readonly ValueKind[]): void {
    if (ranking.length !== ALL_VALUE_KINDS.length) {
        throw new Error(
            `Expected exactly ${ALL_VALUE_KINDS.length} ranked values, got ${ranking.length}`
        );
    }
    const unique = new Set(ranking);
    if (unique.size !== ALL_VALUE_KINDS.length) {
        throw new Error('Duplicate value in valueRanking');
    }
    for (const value of ranking) {
        if (!ALL_VALUE_KINDS.includes(value)) {
            throw new Error(`Unknown value in valueRanking: ${value}`);
        }
    }
}
