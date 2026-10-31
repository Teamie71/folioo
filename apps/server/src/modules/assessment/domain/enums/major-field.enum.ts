// 전공 무관은 majorField: null로 표현하므로 여기엔 10계열만 정의한다.
export enum MajorField {
    HUMANITIES_SOCIAL = 'HUMANITIES_SOCIAL', // 인문·사회
    NATURAL_SCIENCE = 'NATURAL_SCIENCE', // 자연과학
    LANGUAGE = 'LANGUAGE', // 어문
    BUSINESS = 'BUSINESS', // 경영
    ECONOMICS = 'ECONOMICS', // 경제
    MEDIA_COMMUNICATION = 'MEDIA_COMMUNICATION', // 미디어커뮤니케이션
    MATH_STATISTICS = 'MATH_STATISTICS', // 수리·통계
    COMPUTER_SCIENCE = 'COMPUTER_SCIENCE', // 컴퓨터공학
    ENGINEERING = 'ENGINEERING', // 공학계열
    ART_DESIGN = 'ART_DESIGN', // 예술·디자인
}

export const ALL_MAJOR_FIELDS: readonly MajorField[] = [
    MajorField.HUMANITIES_SOCIAL,
    MajorField.NATURAL_SCIENCE,
    MajorField.LANGUAGE,
    MajorField.BUSINESS,
    MajorField.ECONOMICS,
    MajorField.MEDIA_COMMUNICATION,
    MajorField.MATH_STATISTICS,
    MajorField.COMPUTER_SCIENCE,
    MajorField.ENGINEERING,
    MajorField.ART_DESIGN,
];

export const MAJOR_FIELD_LABEL: Readonly<Record<MajorField, string>> = {
    [MajorField.HUMANITIES_SOCIAL]: '인문·사회',
    [MajorField.NATURAL_SCIENCE]: '자연과학',
    [MajorField.LANGUAGE]: '어문',
    [MajorField.BUSINESS]: '경영',
    [MajorField.ECONOMICS]: '경제',
    [MajorField.MEDIA_COMMUNICATION]: '미디어커뮤니케이션',
    [MajorField.MATH_STATISTICS]: '수리·통계',
    [MajorField.COMPUTER_SCIENCE]: '컴퓨터공학',
    [MajorField.ENGINEERING]: '공학계열',
    [MajorField.ART_DESIGN]: '예술·디자인',
};

export enum MajorFieldType {
    NEUTRAL = 'NEUTRAL',
    BONUS = 'BONUS',
    RESTRICTED = 'RESTRICTED',
}
