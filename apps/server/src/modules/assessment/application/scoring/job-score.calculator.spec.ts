import { TraitKind } from '../../domain/enums/trait-kind.enum';
import { TraitVector } from '../../domain/types';
import { JobScoringInput, scoreJobs } from './job-score.calculator';

const zeroVector = (): TraitVector => ({
    [TraitKind.INVESTIGATIVE]: 0,
    [TraitKind.SOCIAL]: 0,
    [TraitKind.ENTERPRISING]: 0,
    [TraitKind.CONVENTIONAL]: 0,
    [TraitKind.REALISTIC]: 0,
    [TraitKind.ARTISTIC]: 0,
});

const vector = (overrides: Partial<TraitVector>): TraitVector => ({
    ...zeroVector(),
    ...overrides,
});

const job = (code: string, traits: TraitVector): JobScoringInput => ({
    code,
    name: code,
    traits,
    summary: '',
    coreSkills: [],
    recommendedActivities: [],
});

describe('scoreJobs', () => {
    it('gives a perfect match rate of 80% when trait vectors are identical and no bonus applies', () => {
        const user = vector({ [TraitKind.INVESTIGATIVE]: 4, [TraitKind.SOCIAL]: 2 });
        const jobs = [job('A', vector({ [TraitKind.INVESTIGATIVE]: 4, [TraitKind.SOCIAL]: 2 }))];

        const result = scoreJobs(jobs, user, new Set(), 3, 0.8, 0.2);

        // cosine similarity 1.0 * 0.8 계수 = 0.8 -> 80%
        expect(result[0].matchRate).toBe(80);
    });

    it('adds the major bonus on top of the trait match for bonus-eligible jobs', () => {
        const user = vector({ [TraitKind.INVESTIGATIVE]: 4, [TraitKind.SOCIAL]: 2 });
        const jobs = [job('A', vector({ [TraitKind.INVESTIGATIVE]: 4, [TraitKind.SOCIAL]: 2 }))];

        const result = scoreJobs(jobs, user, new Set(['A']), 3, 0.8, 0.2);

        // 0.8(성향매칭) + 0.2(가산) = 1.0 -> 100%
        expect(result[0].matchRate).toBe(100);
    });

    it('does not divide by zero when either vector is the zero vector', () => {
        const jobs = [job('A', zeroVector())];
        expect(() => scoreJobs(jobs, zeroVector(), new Set(), 3, 0.8, 0.2)).not.toThrow();
        expect(scoreJobs(jobs, zeroVector(), new Set(), 3, 0.8, 0.2)[0].matchRate).toBe(0);

        const nonZeroUser = vector({ [TraitKind.INVESTIGATIVE]: 4 });
        expect(scoreJobs(jobs, nonZeroUser, new Set(), 3, 0.8, 0.2)[0].matchRate).toBe(0);
    });

    it('returns only the top N by score, descending', () => {
        const user = vector({ [TraitKind.INVESTIGATIVE]: 6 });
        const jobs = [
            job('LOW', vector({ [TraitKind.SOCIAL]: 6 })), // orthogonal -> 0
            job('HIGH', vector({ [TraitKind.INVESTIGATIVE]: 6 })), // identical -> best
            job('MID', vector({ [TraitKind.INVESTIGATIVE]: 3, [TraitKind.SOCIAL]: 3 })),
        ];

        const result = scoreJobs(jobs, user, new Set(), 2, 0.8, 0.2);

        expect(result).toHaveLength(2);
        expect(result[0].code).toBe('HIGH');
        expect(result.map((r) => r.code)).not.toContain('LOW');
    });

    it('breaks ties deterministically by job code ascending, stable across repeated calls', () => {
        const user = vector({ [TraitKind.INVESTIGATIVE]: 4 });
        const jobs = [
            job('ZEBRA', vector({ [TraitKind.INVESTIGATIVE]: 4 })),
            job('ALPHA', vector({ [TraitKind.INVESTIGATIVE]: 4 })),
            job('MIKE', vector({ [TraitKind.INVESTIGATIVE]: 4 })),
        ];

        for (let i = 0; i < 100; i++) {
            const result = scoreJobs(jobs, user, new Set(), 3, 0.8, 0.2);
            expect(result.map((r) => r.code)).toEqual(['ALPHA', 'MIKE', 'ZEBRA']);
        }
    });
});
