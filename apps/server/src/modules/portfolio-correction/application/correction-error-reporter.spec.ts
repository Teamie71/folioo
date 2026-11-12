jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn(), captureMessage: jest.fn() }));
import * as Sentry from '@sentry/nestjs';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { reportCorrectionAiPdfFailure, reportCorrectionError } from './correction-error-reporter';

describe('correction-error-reporter', () => {
    beforeEach(() => jest.clearAllMocks());

    it('① 우리 서버 예외는 단계, 사용자 ID, 첨삭 ID를 붙여 captureException한다', () => {
        const error = new Error('db down');

        reportCorrectionError(error, 'fallback-status', 10, 3);

        expect(Sentry.captureException).toHaveBeenCalledWith(error, {
            tags: { component: 'correction', 'correction.stage': 'fallback-status' },
            user: { id: '3' },
            extra: { correction_id: 10 },
        });
    });

    it('② AI 호출 예외는 ai-relay로 단계별 이슈에 묶는다', () => {
        reportCorrectionError(
            new BusinessException(ErrorCode.AI_RELAY_REQUEST_FAILED),
            'generate',
            10,
            3
        );

        expect(Sentry.captureException).not.toHaveBeenCalled();
        expect(Sentry.captureMessage).toHaveBeenCalledWith('Correction AI relay failed', {
            level: 'error',
            tags: { component: 'correction', source: 'ai-relay', 'correction.stage': 'generate' },
            fingerprint: ['correction', 'ai-relay', 'generate'],
            user: { id: '3' },
            extra: { correction_id: 10 },
        });
    });

    it('③ PDF 추출 실패 콜백은 ai-internal로 보내고 AI 에러 원문은 넣지 않는다', () => {
        reportCorrectionAiPdfFailure(10, 3);

        expect(Sentry.captureMessage).toHaveBeenCalledWith('Correction PDF extraction failed', {
            level: 'error',
            tags: {
                component: 'correction',
                source: 'ai-internal',
                'correction.stage': 'pdf-extraction',
            },
            fingerprint: ['correction', 'ai-internal', 'pdf-extraction'],
            user: { id: '3' },
            extra: { correction_id: 10 },
        });
    });
});
