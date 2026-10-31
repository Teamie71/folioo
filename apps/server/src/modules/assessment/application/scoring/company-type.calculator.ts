import { ALL_VALUE_KINDS } from '../../domain/enums/value-kind.enum';
import { ValueVector, ScoredCompanyType } from '../../domain/types';
import { sortByScoreDesc } from './score-sort.util';

export interface CompanyTypeScoringInput {
    code: string;
    name: string;
    values: ValueVector;
    description: string;
    tip: string | null;
}

// 순수 함수: 적합도 = (사용자 가중치 · 기업형태 배점벡터) × 100.
// ROC 가중치 합이 1인 convex combination이고 배점벡터 값이 전부 [0,1] 범위라
// 결과는 항상 [0,100] 안에 들어온다(수학적으로 클램프가 필요 없음, 3-6 확인필요 참고).
export function scoreCompanyTypes(
    companyTypes: readonly CompanyTypeScoringInput[],
    userValueWeights: ValueVector,
    topN: number
): ScoredCompanyType[] {
    const scored = companyTypes.map((companyType) => {
        const dot = ALL_VALUE_KINDS.reduce(
            (sum, value) => sum + userValueWeights[value] * companyType.values[value],
            0
        );
        return { companyType, matchRate: dot * 100 };
    });

    const sorted = sortByScoreDesc(
        scored,
        (s) => s.matchRate,
        (s) => s.companyType.code
    );

    return sorted.slice(0, topN).map(({ companyType, matchRate }) => ({
        code: companyType.code,
        name: companyType.name,
        matchRate: Math.round(matchRate),
        description: companyType.description,
        tip: companyType.tip,
    }));
}
