export enum CompanyTypeKind {
    LARGE_ENTERPRISE = 'LARGE_ENTERPRISE', // 대기업
    MID_SMALL_ENTERPRISE = 'MID_SMALL_ENTERPRISE', // 중견·중소기업
    STARTUP = 'STARTUP', // 스타트업
    PUBLIC_INSTITUTION = 'PUBLIC_INSTITUTION', // 공기업·공공기관
    FOREIGN = 'FOREIGN', // 외국계
    AGENCY = 'AGENCY', // 에이전시
}

export const ALL_COMPANY_TYPE_KINDS: readonly CompanyTypeKind[] = [
    CompanyTypeKind.LARGE_ENTERPRISE,
    CompanyTypeKind.MID_SMALL_ENTERPRISE,
    CompanyTypeKind.STARTUP,
    CompanyTypeKind.PUBLIC_INSTITUTION,
    CompanyTypeKind.FOREIGN,
    CompanyTypeKind.AGENCY,
];

export const COMPANY_TYPE_KIND_LABEL: Readonly<Record<CompanyTypeKind, string>> = {
    [CompanyTypeKind.LARGE_ENTERPRISE]: '대기업',
    [CompanyTypeKind.MID_SMALL_ENTERPRISE]: '중견·중소기업',
    [CompanyTypeKind.STARTUP]: '스타트업',
    [CompanyTypeKind.PUBLIC_INSTITUTION]: '공기업·공공기관',
    [CompanyTypeKind.FOREIGN]: '외국계',
    [CompanyTypeKind.AGENCY]: '에이전시',
};
