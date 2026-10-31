import { timingSafeEqual } from 'node:crypto';

// 시크릿 비교용. 길이가 다르면 바로 false, 같으면 상수 시간으로 비교한다.
export function safeEqual(provided: string, expected: string): boolean {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);

    if (providedBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
}
