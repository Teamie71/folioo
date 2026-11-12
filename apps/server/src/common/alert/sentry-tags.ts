/**
 * Sentry 이벤트 태그 값. 보고하는 쪽(카카오·첨삭 reporter)과 읽는 쪽(디스코드 알림 분류)이 같은 값을 쓰도록 모아 둔다.
 * 값을 바꾸면 Sentry 이슈 fingerprint와 검색 조건도 바뀌므로 주의한다.
 */
export const SENTRY_COMPONENT = {
    KAKAO: 'kakao',
    CORRECTION: 'correction',
} as const;
export type SentryComponent = (typeof SENTRY_COMPONENT)[keyof typeof SENTRY_COMPONENT];

/** 실패 원인 구분. 없으면 ① 우리 서버 실패다. */
export const SENTRY_SOURCE = {
    /** ② AI 서버 호출 실패 */
    AI_RELAY: 'ai-relay',
    /** ③ AI 서버가 실패로 끝냈다고 알려 옴 */
    AI_INTERNAL: 'ai-internal',
} as const;
