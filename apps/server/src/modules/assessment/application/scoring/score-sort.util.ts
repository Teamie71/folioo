// 점수 DESC, 코드 ASC로 결정론적 정렬한다(동점 시 tie-break, 3-5/3-6 공통 원칙).
export function sortByScoreDesc<T>(
    scored: readonly T[],
    score: (item: T) => number,
    code: (item: T) => string
): T[] {
    return [...scored].sort((a, b) => score(b) - score(a) || code(a).localeCompare(code(b)));
}
