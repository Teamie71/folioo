import { createKeyThrottle } from './key-throttle.util';

describe('createKeyThrottle', () => {
    it('같은 키는 간격 안에서 한 번만 통과시킨다', () => {
        let now = 0;
        const allow = createKeyThrottle(1000, () => now);

        expect(allow('a')).toBe(true);
        now = 999;
        expect(allow('a')).toBe(false);
        now = 1000;
        expect(allow('a')).toBe(true);
    });

    it('키가 다르면 따로 센다', () => {
        const allow = createKeyThrottle(1000, () => 0);

        expect(allow('a')).toBe(true);
        expect(allow('b')).toBe(true);
        expect(allow('a')).toBe(false);
    });

    it('간격이 지난 기록은 지워서 메모리에 쌓이지 않는다', () => {
        let now = 0;
        const allow = createKeyThrottle(1000, () => now);

        allow('user-1');
        allow('user-2');
        expect(allow.size()).toBe(2);

        now = 1500;
        allow('user-3');

        expect(allow.size()).toBe(1);
        expect(allow('user-1')).toBe(true);
    });
});
