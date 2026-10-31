import { getEndOfThisSeoulWeekSunday } from './seoul-date.util';

describe('getEndOfThisSeoulWeekSunday', () => {
    it('returns end of the upcoming Sunday for Monday 00:00 KST', () => {
        const mondayStartKst = new Date('2026-04-05T15:00:00.000Z');

        const result = getEndOfThisSeoulWeekSunday(mondayStartKst);

        expect(result.toISOString()).toBe('2026-04-12T14:59:59.000Z');
    });

    it('returns same-day end when input date is Sunday in KST', () => {
        const sundayNoonKst = new Date('2026-04-12T03:00:00.000Z');

        const result = getEndOfThisSeoulWeekSunday(sundayNoonKst);

        expect(result.toISOString()).toBe('2026-04-12T14:59:59.000Z');
    });
});
