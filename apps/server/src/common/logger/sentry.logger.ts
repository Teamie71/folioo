import { ConsoleLogger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

type SentryLogLevel = 'info' | 'warn' | 'error' | 'fatal';
type LogAttributes = Record<string, string | number | boolean>;

/** 앱이 뜰 때마다 수백 줄씩 찍히는 Nest 부트스트랩 로그는 Sentry로 보내지 않는다 (Logs 쿼터 절약). */
const SKIPPED_CONTEXTS: ReadonlySet<string> = new Set([
    'InstanceLoader',
    'RoutesResolver',
    'RouterExplorer',
    'NestFactory',
]);

/** 로그 인자 객체에서 이 이름이 들어간 키는 보내지 않는다 (instrument.ts의 헤더 마스킹과 같은 기준). */
const SENSITIVE_KEY_PATTERN = /auth|token|secret|key|cookie|session|password/i;

/** 메시지에 AI 응답·외부 API 응답 본문이 들어가는 로그가 있어 길이를 자른다. */
const MAX_MESSAGE_LENGTH = 1000;
const MAX_ATTRIBUTE_LENGTH = 300;

const truncate = (value: string, max: number): string =>
    value.length > max ? `${value.slice(0, max)}…(truncated)` : value;

const toMessage = (message: unknown): string => {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.message;
    try {
        // 객체를 메시지로 넘겨도 속성과 같은 기준으로 민감한 키를 뺀다 (중첩 객체 포함).
        return JSON.stringify(message, (key, value: unknown) =>
            key && SENSITIVE_KEY_PATTERN.test(key) ? undefined : value
        );
    } catch {
        return String(message);
    }
};

/**
 * NestJS Logger 출력을 콘솔과 Sentry Logs에 같이 보낸다.
 *
 * - log → info, warn, error, fatal만 보낸다 (debug·verbose는 보내지 않음)
 * - 마지막 문자열 인자는 Nest 규칙대로 context로 보고 `context` 속성에 넣는다
 * - 객체 인자는 문자열·숫자·불리언 값만 속성으로 넣는다 (예: `{ userId, requestId }`)
 * - error의 stack 인자는 보내지 않는다. 스택트레이스는 Sentry Issues에서 본다
 * - 같은 요청의 에러·트레이스·사용자와는 Sentry가 scope로 연결한다
 */
export class SentryLogger extends ConsoleLogger {
    log(message: unknown, ...optionalParams: unknown[]): void {
        super.log(message, ...optionalParams);
        this.forward('info', message, optionalParams);
    }

    warn(message: unknown, ...optionalParams: unknown[]): void {
        super.warn(message, ...optionalParams);
        this.forward('warn', message, optionalParams);
    }

    error(message: unknown, ...optionalParams: unknown[]): void {
        super.error(message, ...optionalParams);
        this.forward('error', message, optionalParams);
    }

    fatal(message: unknown, ...optionalParams: unknown[]): void {
        super.fatal(message, ...optionalParams);
        this.forward('fatal', message, optionalParams);
    }

    private forward(level: SentryLogLevel, message: unknown, optionalParams: unknown[]): void {
        const { context, params } = this.splitContext(optionalParams);
        if (context && SKIPPED_CONTEXTS.has(context)) return;

        const attributes: LogAttributes = {};
        if (context) attributes.context = context;
        for (const param of params) Object.assign(attributes, this.toAttributes(param));

        Sentry.logger[level](truncate(toMessage(message), MAX_MESSAGE_LENGTH), attributes);
    }

    /** Nest Logger는 context를 마지막 문자열 인자로 넘긴다. 없으면 이 로거 인스턴스의 context를 쓴다. */
    private splitContext(optionalParams: unknown[]): { context?: string; params: unknown[] } {
        const last = optionalParams.at(-1);
        if (optionalParams.length > 0 && typeof last === 'string') {
            return { context: last, params: optionalParams.slice(0, -1) };
        }
        return { context: this.context, params: optionalParams };
    }

    private toAttributes(param: unknown): LogAttributes {
        // 문자열 인자는 error의 stack이거나 추가 메시지다. stack은 Issues에서 보므로 보내지 않는다.
        if (param === null || typeof param !== 'object' || Array.isArray(param)) return {};

        const attributes: LogAttributes = {};
        for (const [key, value] of Object.entries(param as Record<string, unknown>)) {
            if (SENSITIVE_KEY_PATTERN.test(key)) continue;
            if (typeof value === 'string') {
                attributes[key] = truncate(value, MAX_ATTRIBUTE_LENGTH);
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                attributes[key] = value;
            }
        }
        return attributes;
    }
}
