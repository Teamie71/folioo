export type KeyThrottle = ((key: string) => boolean) & {
    /** 현재 기억하고 있는 키 수 (테스트·점검용) */
    size(): number;
};

/**
 * 같은 키는 intervalMs 동안 한 번만 통과시키는 throttle을 만든다.
 * 반복되는 실패 보고(Sentry, 디스코드 알림)가 쏟아지지 않게 할 때 쓴다. 상태는 프로세스 메모리에만 둔다.
 *
 * 키가 사용자 단위로 늘어날 수 있으므로, intervalMs마다 한 번 intervalMs가 지난 기록을 지운다.
 * 지난 기록은 어차피 다시 통과되는 상태라 지워도 동작은 같다.
 */
export function createKeyThrottle(
    intervalMs: number,
    now: () => number = () => Date.now()
): KeyThrottle {
    const lastPassedAt = new Map<string, number>();
    let lastSweptAt = now();

    const sweep = (current: number): void => {
        if (current - lastSweptAt < intervalMs) return;
        for (const [key, passedAt] of lastPassedAt) {
            if (current - passedAt >= intervalMs) lastPassedAt.delete(key);
        }
        lastSweptAt = current;
    };

    const shouldPass = (key: string): boolean => {
        const current = now();
        sweep(current);
        const last = lastPassedAt.get(key);
        if (last !== undefined && current - last < intervalMs) return false;
        lastPassedAt.set(key, current);
        return true;
    };

    return Object.assign(shouldPass, { size: () => lastPassedAt.size });
}
