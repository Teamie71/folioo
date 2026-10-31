// 실제 문항지 기준 6단계 확정(1~15번 전부). "그렇다"=SCALE_MAX(그 특성이 강함),
// "그렇지 않다"=SCALE_MIN 방향으로 응답값을 그대로 합산한다(1~12번), 13~15번은
// TRADEOFF_SCORE_TABLE이 이 방향을 그대로 반영해 미리 변환해둔 값이다.
export const SCALE_MIN = 1;
export const SCALE_MAX = 6;

// 성향매칭 계수/전공가산/ROC 가중치는 ruleset_versions.trait_match_coefficient/
// major_bonus_score/roc_weights로 이동.
export const TOP_JOBS_COUNT = 3;
export const TOP_COMPANY_TYPES_COUNT = 1;
