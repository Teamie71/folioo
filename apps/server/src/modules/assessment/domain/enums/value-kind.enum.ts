export enum ValueKind {
    REWARD = 'REWARD',
    STABILITY = 'STABILITY',
    NAME_VALUE = 'NAME_VALUE',
    GROWTH = 'GROWTH',
    WORK_LIFE_BALANCE = 'WORK_LIFE_BALANCE',
}

export const ALL_VALUE_KINDS: readonly ValueKind[] = [
    ValueKind.REWARD,
    ValueKind.STABILITY,
    ValueKind.NAME_VALUE,
    ValueKind.GROWTH,
    ValueKind.WORK_LIFE_BALANCE,
];

export const VALUE_KIND_LABEL: Readonly<Record<ValueKind, string>> = {
    [ValueKind.REWARD]: '보상',
    [ValueKind.STABILITY]: '안정',
    [ValueKind.NAME_VALUE]: '네임밸류',
    [ValueKind.GROWTH]: '성장·주도권',
    [ValueKind.WORK_LIFE_BALANCE]: '워라밸',
};

// 카드 좌/우 배치 우선순위. 두 값을 비교할 때 이 배열에서 인덱스가 낮은 쪽이 항상 왼쪽 카드에 온다.
// (실제 순위 산정과는 무관한 화면 표시 규칙일 뿐이다.)
export const VALUE_DISPLAY_PRECEDENCE: readonly ValueKind[] = [
    ValueKind.REWARD,
    ValueKind.STABILITY,
    ValueKind.NAME_VALUE,
    ValueKind.GROWTH,
    ValueKind.WORK_LIFE_BALANCE,
];
