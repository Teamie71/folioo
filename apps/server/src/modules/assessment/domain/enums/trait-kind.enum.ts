export enum TraitKind {
    INVESTIGATIVE = 'INVESTIGATIVE',
    SOCIAL = 'SOCIAL',
    ENTERPRISING = 'ENTERPRISING',
    CONVENTIONAL = 'CONVENTIONAL',
    REALISTIC = 'REALISTIC',
    ARTISTIC = 'ARTISTIC',
}

export const ALL_TRAIT_KINDS: readonly TraitKind[] = [
    TraitKind.INVESTIGATIVE,
    TraitKind.SOCIAL,
    TraitKind.ENTERPRISING,
    TraitKind.CONVENTIONAL,
    TraitKind.REALISTIC,
    TraitKind.ARTISTIC,
];

export const TRAIT_KIND_LABEL: Readonly<Record<TraitKind, string>> = {
    [TraitKind.INVESTIGATIVE]: '탐구형',
    [TraitKind.SOCIAL]: '공감형',
    [TraitKind.ENTERPRISING]: '추진형',
    [TraitKind.CONVENTIONAL]: '체계형',
    [TraitKind.REALISTIC]: '현장형',
    [TraitKind.ARTISTIC]: '창작형',
};
