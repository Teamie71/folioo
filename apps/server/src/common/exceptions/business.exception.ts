import { HttpException } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';
import { ErrorMap } from './error-code';

export class BusinessException extends HttpException {
    constructor(errorCode: ErrorCode, details?: unknown) {
        const errorDetail = ErrorMap[errorCode];

        if (!errorDetail) {
            super(
                {
                    errorCode: 'UNKNOWN_ERROR',
                    reason: '정의되지 않은 에러가 발생했습니다.',
                    details,
                },
                500
            );
            return;
        }

        super(
            {
                errorCode: errorCode,
                reason: errorDetail.message,
                details,
            },
            errorDetail.statusCode
        );
    }
}
