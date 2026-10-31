import ms, { StringValue } from 'ms';

export class TimeUtil {
    /**
     * 입력값을 밀리초(ms) 단위의 숫자로 변환합니다.
     * 사용처: Cookie maxAge, setTimeout 등
     * 예: '1d' -> 86400000
     */
    static toMs(value: string | number): number {
        if (typeof value === 'number') return value;
        return ms(value as StringValue);
    }

    /**
     * 입력값을 초(sec) 단위의 숫자로 변환합니다. (소수점 버림)
     * 사용처: 토큰 만료 TTL 계산, JWT exp claim 등
     * 예: '1m' -> 60
     */
    static toSec(value: string | number): number {
        const msValue = this.toMs(value);
        return Math.floor(msValue / 1000);
    }
}
