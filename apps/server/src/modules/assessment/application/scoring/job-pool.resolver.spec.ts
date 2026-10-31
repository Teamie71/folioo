import { MajorField, MajorFieldType } from '../../domain/enums/major-field.enum';
import { resolveJobPool, MajorFieldPoolConfig } from './job-pool.resolver';

const CONFIGS = new Map<MajorField, MajorFieldPoolConfig>([
    [MajorField.HUMANITIES_SOCIAL, { type: MajorFieldType.NEUTRAL, targetJobCodes: [] }],
    [
        MajorField.BUSINESS,
        {
            type: MajorFieldType.BONUS,
            targetJobCodes: ['HRM', 'FINANCE_ACCOUNTING', 'PROCUREMENT_SCM', 'PUBLIC_ADMIN'],
        },
    ],
    [
        MajorField.COMPUTER_SCIENCE,
        {
            type: MajorFieldType.RESTRICTED,
            targetJobCodes: [
                'FRONTEND_DEV',
                'BACKEND_DEV',
                'AI_ML_ENGINEER',
                'QA_ENGINEER',
                'GAME_DEV',
                'DEVOPS_ENGINEER',
                'SECURITY_INFRA',
                'DATA_ANALYSIS',
            ],
        },
    ],
]);

describe('resolveJobPool', () => {
    it('전공 무관(null) -> 전체 풀, 가산 없음', () => {
        const result = resolveJobPool(null, CONFIGS);
        expect(result.isRestricted).toBe(false);
        expect(result.bonusJobCodes.size).toBe(0);
    });

    it('설정이 없는 전공(configs에 없음) -> 전체 풀, 가산 없음', () => {
        const result = resolveJobPool(MajorField.NATURAL_SCIENCE, CONFIGS);
        expect(result.isRestricted).toBe(false);
        expect(result.bonusJobCodes.size).toBe(0);
    });

    it('NEUTRAL 계열(인문·사회) -> 전체 풀, 가산 없음', () => {
        const result = resolveJobPool(MajorField.HUMANITIES_SOCIAL, CONFIGS);
        expect(result.isRestricted).toBe(false);
        expect(result.bonusJobCodes.size).toBe(0);
    });

    it('BONUS 계열(경영) -> 전체 풀 + 대상 직무에만 가산', () => {
        const result = resolveJobPool(MajorField.BUSINESS, CONFIGS);
        expect(result.isRestricted).toBe(false);
        expect(result.bonusJobCodes.size).toBe(4);
        expect(result.bonusJobCodes.has('HRM')).toBe(true);
        expect(result.bonusJobCodes.has('FRONTEND_DEV')).toBe(false); // 비대상 직무엔 가산 안 샘
    });

    it('RESTRICTED 계열(컴퓨터공학) -> 대상 직무 8개만', () => {
        const result = resolveJobPool(MajorField.COMPUTER_SCIENCE, CONFIGS);
        expect(result.isRestricted).toBe(true);
        expect(result.restrictedJobCodes).toHaveLength(8);
        expect(result.restrictedJobCodes).toContain('BACKEND_DEV');
        expect(result.restrictedJobCodes).not.toContain('HRM');
        expect(result.bonusJobCodes.size).toBe(0);
    });
});
