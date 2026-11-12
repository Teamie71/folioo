import * as Sentry from '@sentry/nestjs';
import { isAiRelayError } from 'src/common/utils/ai-relay-error.util';

/**
 * 첨삭의 백그라운드 실패를 Sentry에 보낸다.
 * API는 이미 응답한 뒤라 전역 예외 필터가 볼 수 없는 실패들이다. 카카오와 같은 기준으로 세 갈래로 나눈다.
 *
 * - ① 우리 서버 자체 실패: captureException, `component: correction`
 * - ② AI 서버 호출 실패: captureMessage, `source: ai-relay`
 * - ③ AI 서버 내부 실패(PDF 추출 FAILED 콜백): captureMessage, `source: ai-internal`
 *
 * 사용자 요청 한 번에 한 번씩만 실패하므로 중복 제한은 두지 않는다 (디스코드 알림은 자체적으로 5분에 한 번).
 * 이벤트에는 사용자 ID와 첨삭 ID만 넣는다. AI 서버가 보낸 에러 원문은 넣지 않는다.
 */

export type CorrectionStage = 'generate' | 'rag' | 'fallback-status' | 'pdf-extraction';

const eventContext = (correctionId: number, userId: number) => ({
    user: { id: String(userId) },
    extra: { correction_id: correctionId },
});

/** ① 첨삭 처리 중 catch한 예외. AI 호출 예외면 ②로 보낸다. */
export function reportCorrectionError(
    error: unknown,
    stage: CorrectionStage,
    correctionId: number,
    userId: number
): void {
    if (isAiRelayError(error)) {
        Sentry.captureMessage('Correction AI relay failed', {
            level: 'error',
            tags: { component: 'correction', source: 'ai-relay', 'correction.stage': stage },
            fingerprint: ['correction', 'ai-relay', stage],
            ...eventContext(correctionId, userId),
        });
        return;
    }

    Sentry.captureException(error, {
        tags: { component: 'correction', 'correction.stage': stage },
        ...eventContext(correctionId, userId),
    });
}

/** ③ AI 서버가 PDF 추출을 실패로 끝냄. 원인은 AI 서버 로그에서 correction_id로 찾는다. */
export function reportCorrectionAiPdfFailure(correctionId: number, userId: number): void {
    Sentry.captureMessage('Correction PDF extraction failed', {
        level: 'error',
        tags: {
            component: 'correction',
            source: 'ai-internal',
            'correction.stage': 'pdf-extraction',
        },
        fingerprint: ['correction', 'ai-internal', 'pdf-extraction'],
        ...eventContext(correctionId, userId),
    });
}
