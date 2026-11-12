import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-code.enum';

const AI_RELAY_ERROR_CODES: ReadonlySet<string> = new Set([
    ErrorCode.AI_RELAY_REQUEST_FAILED,
    ErrorCode.INTERVIEW_AI_RELAY_FAILED,
]);

/** AI 서버 호출 자체가 실패한 예외인지 (AiRelayPort가 던지는 예외). Sentry에서 ② ai-relay로 분류할 때 쓴다. */
export function isAiRelayError(error: unknown): boolean {
    if (!(error instanceof BusinessException)) return false;
    const { errorCode } = error.getResponse() as { errorCode?: string };
    return errorCode !== undefined && AI_RELAY_ERROR_CODES.has(errorCode);
}
