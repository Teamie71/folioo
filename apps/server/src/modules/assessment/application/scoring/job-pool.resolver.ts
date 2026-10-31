import { MajorField, MajorFieldType } from '../../domain/enums/major-field.enum';

export interface MajorFieldPoolConfig {
    type: MajorFieldType;
    targetJobCodes: readonly string[];
}

export interface JobPoolResolution {
    // true면 restrictedJobCodes에 속한 직무만 계산 대상. false면 전체 풀 대상(가산점만 다름).
    isRestricted: boolean;
    restrictedJobCodes: readonly string[];
    bonusJobCodes: ReadonlySet<string>;
}

// 순수 함수: 3-4 표 그대로. majorField가 null(전공 무관)이거나 NEUTRAL이면 전체 풀, 가산 없음.
// configs는 DB(major_field_configs)에서 조회한 값을 호출부가 넘긴다.
export function resolveJobPool(
    majorField: MajorField | null,
    configs: ReadonlyMap<MajorField, MajorFieldPoolConfig>
): JobPoolResolution {
    const config = majorField === null ? null : (configs.get(majorField) ?? null);

    if (config?.type === MajorFieldType.RESTRICTED) {
        return {
            isRestricted: true,
            restrictedJobCodes: config.targetJobCodes,
            bonusJobCodes: new Set(),
        };
    }

    if (config?.type === MajorFieldType.BONUS) {
        return {
            isRestricted: false,
            restrictedJobCodes: [],
            bonusJobCodes: new Set(config.targetJobCodes),
        };
    }

    // null 또는 NEUTRAL
    return { isRestricted: false, restrictedJobCodes: [], bonusJobCodes: new Set() };
}
