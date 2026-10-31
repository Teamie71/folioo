import { ApiProperty } from '@nestjs/swagger';

export class ErrorPayload {
    errorCode: string;
    reason: string;
    details?: unknown;
    path: string;
}

export class CommonResponse<T = unknown> {
    readonly timestamp: string;
    readonly isSuccess: boolean;
    readonly error: ErrorPayload | null;

    @ApiProperty({
        description: '결과 데이터',
        nullable: true,
        type: () => Object,
    })
    readonly result: T | null;
    // 로깅 시 사용
    // readonly traceId: string;

    private constructor(isSuccess: boolean, error: ErrorPayload | null, result: T | null) {
        this.timestamp = new Date().toISOString();
        this.isSuccess = isSuccess;
        this.error = error;
        this.result = result;
    }

    static success<T>(data: T): CommonResponse<T> {
        return new CommonResponse(true, null, data);
    }

    static fail(
        errorCode: string,
        reason: string,
        path: string,
        details: unknown = null
    ): CommonResponse<null> {
        return new CommonResponse(false, { errorCode, reason, details, path }, null);
    }
}
