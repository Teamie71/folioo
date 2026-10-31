import { ValueKind } from '../../domain/enums/value-kind.enum';
import { TraitVector } from '../../domain/types';
import { ALL_TRAIT_KINDS, TraitKind } from '../../domain/enums/trait-kind.enum';

// 순수 함수: 성향 벡터에서 최고점 특성을 고른다. 동점이면 ALL_TRAIT_KINDS 선언 순서상
// 먼저 나오는 특성으로 결정론적으로 고정한다.
export function resolveTopTrait(traitVector: TraitVector): TraitKind {
    return ALL_TRAIT_KINDS.reduce((top, trait) =>
        traitVector[trait] > traitVector[top] ? trait : top
    );
}

export function resolveTopValue(ranking: readonly ValueKind[]): ValueKind {
    return ranking[0];
}
