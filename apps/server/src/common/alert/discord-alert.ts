import type { ErrorEvent } from '@sentry/nestjs';
import { createKeyThrottle } from '../utils/key-throttle.util';
import { SENTRY_COMPONENT, SENTRY_SOURCE, type SentryComponent } from './sentry-tags';

/** 같은 에러는 5분에 한 번만 디스코드로 보낸다. 자세한 건수는 Sentry에서 본다. */
export const DISCORD_ALERT_THROTTLE_MS = 5 * 60 * 1000;
const DISCORD_TIMEOUT_MS = 3000;
const HTTP_TOO_MANY_REQUESTS = 429;
const MAX_ERROR_TEXT_LENGTH = 300;
const MAX_PATH_LENGTH = 200;
/** Discord embed description 제한. 넘으면 Webhook이 메시지를 거부한다. */
export const DISCORD_DESCRIPTION_LIMIT = 4096;
const CODE_FENCE = '```';
/** 굵은 라벨과 값 사이 간격 (전각 공백) */
const GAP = '\u3000';

type AlertKind = { title: string; color: number };

const ALERT_KINDS = {
    server: { title: '🔴 서버 5xx 에러', color: 0xe03131 },
    kakaoServer: { title: '🟠 카카오 ① 우리 서버 실패', color: 0xf08c00 },
    kakaoAiRelay: { title: '🟡 카카오 ② AI 서버 호출 실패', color: 0xfab005 },
    kakaoAiInternal: { title: '🟣 카카오 ③ AI 서버 내부 실패', color: 0x9c36b5 },
    correctionServer: { title: '🟠 첨삭 ① 우리 서버 실패', color: 0xf08c00 },
    correctionAiRelay: { title: '🟡 첨삭 ② AI 서버 호출 실패', color: 0xfab005 },
    correctionAiInternal: { title: '🟣 첨삭 ③ AI 서버 내부 실패', color: 0x9c36b5 },
} satisfies Record<string, AlertKind>;

/** 200으로 응답하거나 응답 뒤에 실패해서, 전역 예외 필터 대신 직접 보고하는 기능들 */
const COMPONENT_KINDS: Record<
    SentryComponent,
    { server: AlertKind; aiRelay: AlertKind; aiInternal: AlertKind }
> = {
    [SENTRY_COMPONENT.KAKAO]: {
        server: ALERT_KINDS.kakaoServer,
        aiRelay: ALERT_KINDS.kakaoAiRelay,
        aiInternal: ALERT_KINDS.kakaoAiInternal,
    },
    [SENTRY_COMPONENT.CORRECTION]: {
        server: ALERT_KINDS.correctionServer,
        aiRelay: ALERT_KINDS.correctionAiRelay,
        aiInternal: ALERT_KINDS.correctionAiInternal,
    },
};

/** 디스코드에서 바로 읽히도록 단계 코드를 한글로 바꾼다. 원래 코드도 같이 보여준다. */
const STAGE_LABELS: Record<string, string> = {
    chat: '챗봇 대화',
    activities: '활동 목록',
    'select-activity': '활동 선택',
    submit: 'AI 턴 접수',
    compensate: '실패 턴 보상',
    'recover-turn': '턴 결과 복구',
    'recover-scan': '복구 스캔',
    'link-callback': '카카오 계정 연결',
    generate: '첨삭 생성',
    rag: '기업 분석',
    'fallback-status': '실패 상태 변경',
    'pdf-extraction': 'PDF 추출',
};

export type DiscordMessage = {
    username: string;
    allowed_mentions: { parse: string[] };
    embeds: {
        title: string;
        color: number;
        url?: string;
        description: string;
        footer: { text: string };
        timestamp: string;
    }[];
};

export type DiscordAlertOptions = {
    webhookUrl: string;
    /** Sentry 이벤트 링크용 조직 slug. 없으면 링크 대신 이벤트 ID만 넣는다. */
    sentryOrg?: string;
    fetchFn?: typeof fetch;
    now?: () => number;
    /**
     * 전송 실패 경고를 남길 함수.
     * 이 파일은 instrument.ts가 Sentry.init 전에 불러오므로 `@nestjs/common`을 직접 import하면 안 된다.
     * 먼저 로드되면 Sentry가 Nest Guard·Pipe·Interceptor 계측을 붙이지 못한다.
     */
    warn?: (message: string) => void;
};

const truncate = (value: string, max: number): string =>
    value.length > max ? `${value.slice(0, max)}…` : value;

const code = (value: string): string => `\`${value.replace(/`/g, "'")}\``;

const tagOf = (event: ErrorEvent, name: string): string | undefined => {
    const value = event.tags?.[name];
    return value === undefined || value === null ? undefined : String(value);
};

const kindOf = (event: ErrorEvent): AlertKind => {
    const component = COMPONENT_KINDS[tagOf(event, 'component') as SentryComponent] as
        | (typeof COMPONENT_KINDS)[SentryComponent]
        | undefined;
    if (!component) return ALERT_KINDS.server;
    const source = tagOf(event, 'source');
    if (source === SENTRY_SOURCE.AI_RELAY) return component.aiRelay;
    if (source === SENTRY_SOURCE.AI_INTERNAL) return component.aiInternal;
    return component.server;
};

const stageOf = (event: ErrorEvent): string | undefined =>
    tagOf(event, 'kakao.stage') ?? tagOf(event, 'correction.stage');

const errorTextOf = (event: ErrorEvent): string => {
    const exception = event.exception?.values?.at(-1);
    if (exception) return `${exception.type ?? 'Error'}: ${exception.value ?? ''}`;
    return event.message ?? '(메시지 없음)';
};

const pathOf = (event: ErrorEvent): string | undefined => {
    if (event.request?.url) {
        try {
            return `${event.request.method ?? ''} ${new URL(event.request.url).pathname}`.trim();
        } catch {
            return event.request.url.split('?')[0];
        }
    }
    return event.transaction;
};

/** Sentry가 이슈를 묶는 기준과 비슷하게, 같은 에러를 같은 키로 만든다. 사용자는 키에 넣지 않는다. */
const dedupeKeyOf = (event: ErrorEvent): string => {
    if (event.fingerprint?.length && !event.fingerprint.includes('{{ default }}')) {
        return event.fingerprint.join(':');
    }
    return [
        kindOf(event).title,
        errorTextOf(event),
        pathOf(event) ?? '',
        stageOf(event) ?? '',
    ].join('|');
};

/** "누가" 겪었는지 한 줄로: 사용자 · 첨삭 · request_id */
const targetOf = (event: ErrorEvent): string => {
    const parts: string[] = [];
    if (event.user?.id) parts.push(`사용자 ${code(String(event.user.id))}`);
    const correctionId = event.extra?.correction_id;
    if (typeof correctionId === 'number') parts.push(`첨삭 ${code(String(correctionId))}`);
    const requestId = event.extra?.request_id;
    if (typeof requestId === 'string') parts.push(`request_id ${code(requestId)}`);
    return parts.length ? parts.join(' · ') : '로그인 전 요청';
};

/**
 * 디스코드 메시지
 *
 * 🟡 첨삭 ② AI 서버 호출 실패            ← 종류 (누르면 Sentry 이벤트)
 * 단계  기업 분석 (`rag`)
 * 대상  사용자 `5` · 첨삭 `1`
 * (예외일 때만) 에러 본문 코드 블록
 * 🔗 Sentry에서 자세히 보기
 * local · folioo-server@0.0.1 · 같은 에러는 5분간 다시 알리지 않음
 */
export const buildDiscordMessage = (event: ErrorEvent, sentryOrg?: string): DiscordMessage => {
    const kind = kindOf(event);
    const eventId = event.event_id;
    const link =
        sentryOrg && eventId
            ? `https://${sentryOrg}.sentry.io/issues/?query=${eventId}`
            : undefined;

    const lines: string[] = [];
    const path = pathOf(event);
    if (path) lines.push(`**위치**${GAP}${code(truncate(path, MAX_PATH_LENGTH))}`);
    const stage = stageOf(event);
    if (stage) lines.push(`**단계**${GAP}${STAGE_LABELS[stage] ?? stage} (${code(stage)})`);
    const result = tagOf(event, 'kakao.result') ?? tagOf(event, 'kakao.delivery_status');
    if (result) lines.push(`**결과**${GAP}${code(result)}`);
    lines.push(`**대상**${GAP}${targetOf(event)}`);

    // ②③은 제목이 곧 내용이라, 에러 본문은 예외(5xx, ①)일 때만 보여준다.
    if (event.exception?.values?.length) {
        const text = truncate(errorTextOf(event), MAX_ERROR_TEXT_LENGTH).replaceAll(
            CODE_FENCE,
            "'''"
        );
        lines.push('', `${CODE_FENCE}\n${text}\n${CODE_FENCE}`);
    }

    lines.push(
        '',
        link ? `🔗 [Sentry에서 자세히 보기](${link})` : `Sentry event_id ${code(eventId ?? '-')}`
    );

    return {
        username: 'Folioo Sentry',
        // 에러 메시지에 @everyone 같은 문자열이 들어와도 멘션되지 않게 한다.
        allowed_mentions: { parse: [] },
        embeds: [
            {
                title: kind.title,
                color: kind.color,
                url: link,
                description: truncate(lines.join('\n'), DISCORD_DESCRIPTION_LIMIT - 1),
                footer: {
                    text: [event.environment, event.release, '같은 에러는 5분간 다시 알리지 않음']
                        .filter(Boolean)
                        .join(' · '),
                },
                timestamp: new Date((event.timestamp ?? Date.now() / 1000) * 1000).toISOString(),
            },
        ],
    };
};

/**
 * Sentry로 나가는 에러 이벤트를 디스코드 Webhook으로도 보내는 함수를 만든다.
 * 무료 티어는 Sentry 디스코드 연동을 쓸 수 없어서 서버에서 직접 보낸다.
 *
 * - error·fatal 이벤트만 보낸다 (일반 API는 5xx, 카카오·첨삭은 직접 보고한 ①②③만 Sentry로 나간다)
 * - 같은 에러는 5분에 한 번만 보낸다
 * - 전송은 기다리지 않고, 실패해도 요청 처리와 Sentry 전송에 영향을 주지 않는다
 */
export function createDiscordAlert(options: DiscordAlertOptions): (event: ErrorEvent) => void {
    const warn = options.warn ?? (() => undefined);
    const fetchFn = options.fetchFn ?? fetch;
    const shouldSend = createKeyThrottle(DISCORD_ALERT_THROTTLE_MS, options.now);

    return (event) => {
        if (event.level && event.level !== 'error' && event.level !== 'fatal') return;
        // 전송 중에도 키를 기록해 같은 에러가 동시에 여러 번 나가지 않게 한다.
        // 실패하면 기록을 지워 다음 에러 때 다시 보낸다. 429(속도 제한)는 재시도가 몰리지 않게 그대로 둔다.
        const key = dedupeKeyOf(event);
        if (!shouldSend(key)) return;

        let body: string;
        try {
            body = JSON.stringify(buildDiscordMessage(event, options.sentryOrg));
        } catch {
            return;
        }

        fetchFn(options.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS),
        })
            .then((response) => {
                if (response.ok) return;
                if (response.status !== HTTP_TOO_MANY_REQUESTS) shouldSend.forget(key);
                warn(`Discord alert failed: HTTP ${response.status}`);
            })
            .catch((error: unknown) => {
                shouldSend.forget(key);
                warn(
                    `Discord alert failed: ${error instanceof Error ? error.message : String(error)}`
                );
            });
    };
}
