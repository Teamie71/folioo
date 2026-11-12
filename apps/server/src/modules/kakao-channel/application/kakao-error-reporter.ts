import * as Sentry from '@sentry/nestjs';
import { isAiRelayError } from 'src/common/utils/ai-relay-error.util';
import { createKeyThrottle } from 'src/common/utils/key-throttle.util';
import { SENTRY_COMPONENT, SENTRY_SOURCE } from 'src/common/alert/sentry-tags';

/**
 * 카카오 챗봇 실패를 Sentry에 보낸다 (FO-101 결정).
 *
 * - ① 우리 서버 자체 실패: captureException, `component: kakao`
 * - ② AI 서버 호출 실패: captureMessage, `source: ai-relay`
 * - ③ AI 서버 내부 실패(턴 결과 FAILED): captureMessage, `source: ai-internal`
 *
 * 같은 사용자의 같은 실패는 5분에 한 번만 보낸다. 다른 사용자는 모두 보내서 Users 집계가 맞도록 한다.
 * 사용자를 모르는 실패(10초 주기 복구 스캔 등)는 종류별로 5분에 한 번만 보낸다 (Errors 쿼터 보호).
 * ②③은 고정 fingerprint로 종류별 이슈 하나에 묶는다.
 *
 * 사용자 정보는 이벤트에 직접 넣는다. AI 서버 통지나 복구 작업처럼 요청 scope에 사용자가 없는 경로도 집계되게 하기 위해서다.
 * 이벤트에는 사용자 ID와 request_id 같은 안전한 값만 넣는다. callbackUrl이나 에러 원문의 요청 본문은 넣지 않는다.
 */

export const KAKAO_REPORT_THROTTLE_MS = 5 * 60 * 1000;

export type KakaoStage =
    | 'chat'
    | 'activities'
    | 'select-activity'
    | 'submit'
    | 'compensate'
    | 'recover-turn'
    | 'recover-scan'
    | 'link-callback';

export type KakaoAiRelayResult = 'UNKNOWN' | 'REJECTED' | 'ERROR';

/** 누가 실패를 겪었는지. 모르는 값은 비워 둔다. */
export type KakaoActor = {
    /** Folioo 사용자 ID. 이벤트의 user와 중복 제한에 쓴다. */
    userId?: number;
    /** 사용자 확인 전에 실패했을 때 중복 제한에만 쓴다. Sentry로는 보내지 않는다. */
    kakaoAppUserId?: string;
    requestId?: string;
};

const shouldReport = createKeyThrottle(KAKAO_REPORT_THROTTLE_MS);

function actorKey({ userId, kakaoAppUserId }: KakaoActor): string {
    if (userId !== undefined) return `user:${userId}`;
    if (kakaoAppUserId) return `kakao:${kakaoAppUserId}`;
    return 'system';
}

function eventContext({ userId, requestId }: KakaoActor) {
    return {
        ...(userId !== undefined && { user: { id: String(userId) } }),
        ...(requestId && { extra: { request_id: requestId } }),
    };
}

/** ① 카카오 처리 중 catch한 예외. AI 호출 예외면 ②로 보낸다. */
export function reportKakaoError(error: unknown, stage: KakaoStage, actor: KakaoActor = {}): void {
    if (isAiRelayError(error)) {
        reportKakaoAiRelayFailure(stage, 'ERROR', actor);
        return;
    }
    if (!shouldReport(`server:${stage}:${actorKey(actor)}`)) return;

    Sentry.captureException(error, {
        tags: { component: SENTRY_COMPONENT.KAKAO, 'kakao.stage': stage },
        ...eventContext(actor),
    });
}

/** ② AI 서버가 턴 접수에 응답하지 않았거나(UNKNOWN) 거절했거나(REJECTED) 호출이 실패(ERROR)함. */
export function reportKakaoAiRelayFailure(
    stage: KakaoStage,
    result: KakaoAiRelayResult,
    actor: KakaoActor = {}
): void {
    if (!shouldReport(`ai-relay:${stage}:${result}:${actorKey(actor)}`)) return;

    Sentry.captureMessage('Kakao AI relay failed', {
        level: 'error',
        tags: {
            component: SENTRY_COMPONENT.KAKAO,
            source: SENTRY_SOURCE.AI_RELAY,
            'kakao.stage': stage,
            'kakao.result': result,
        },
        fingerprint: [SENTRY_COMPONENT.KAKAO, SENTRY_SOURCE.AI_RELAY, stage, result],
        ...eventContext(actor),
    });
}

/** ③ AI 서버가 턴을 실패로 끝냄 (통지 또는 상태 조회로 확인). 원인은 AI 서버 로그에서 request_id로 찾는다. */
export function reportKakaoAiTurnFailure(deliveryStatus: string, actor: KakaoActor): void {
    if (!shouldReport(`ai-internal:${deliveryStatus}:${actorKey(actor)}`)) return;

    Sentry.captureMessage('Kakao AI turn failed', {
        level: 'error',
        tags: {
            component: SENTRY_COMPONENT.KAKAO,
            source: SENTRY_SOURCE.AI_INTERNAL,
            'kakao.delivery_status': deliveryStatus,
        },
        fingerprint: [SENTRY_COMPONENT.KAKAO, SENTRY_SOURCE.AI_INTERNAL, deliveryStatus],
        ...eventContext(actor),
    });
}

/**
 * 카카오 계정 연결 콜백에서 카카오 OAuth 호출이 실패함.
 * 카카오 API 예외에는 인가 코드·client_secret·액세스 토큰이 들어갈 수 있어 예외 원문 대신 HTTP 상태만 보낸다.
 */
export function reportKakaoLinkFailure(httpStatus: number | undefined, actor: KakaoActor): void {
    const status = httpStatus === undefined ? 'NO_RESPONSE' : String(httpStatus);
    if (!shouldReport(`link-callback:${status}:${actorKey(actor)}`)) return;

    Sentry.captureMessage('Kakao link callback failed', {
        level: 'error',
        tags: {
            component: SENTRY_COMPONENT.KAKAO,
            'kakao.stage': 'link-callback',
            'kakao.result': status,
        },
        fingerprint: [SENTRY_COMPONENT.KAKAO, 'link-callback', status],
        ...eventContext(actor),
    });
}
