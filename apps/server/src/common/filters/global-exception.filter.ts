import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { captureException } from '@sentry/nestjs';
import { CommonResponse, ErrorPayload } from '../dtos/common-response.dto';
import { ErrorMap } from '../exceptions/error-code';
import { ErrorCode } from '../exceptions/error-code.enum';

interface ValidationErrorResponse {
    message: string | string[];
    error: string;
    statusCode: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

    private formatDetails(details: unknown): string {
        if (details == null) {
            return '';
        }

        try {
            return ` | details=${JSON.stringify(details)}`;
        } catch {
            return ' | details=[unserializable]';
        }
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;

        const ctx = host.switchToHttp();

        const httpStatus =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        if (httpStatus >= 500) {
            captureException(exception instanceof Error ? exception : new Error(String(exception)));
        }

        const path = httpAdapter.getRequestUrl(ctx.getRequest()) as string;

        let errorCode = 'UNKNOWN';
        let reason = 'Business Exception을 사용하세요.';
        let details: unknown = null;

        if (exception instanceof HttpException) {
            const exceptionResponse = exception.getResponse() as unknown;

            if (this.isValidationError(exception, exceptionResponse)) {
                // ValidationPipe / ParseIntPipe 등에서 발생한 검증 에러
                const res = exceptionResponse as ValidationErrorResponse;
                errorCode = ErrorCode.BAD_REQUEST;
                reason = ErrorMap[ErrorCode.BAD_REQUEST].message;
                details = Array.isArray(res.message) ? res.message : [res.message];
            } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const res = exceptionResponse as ErrorPayload;
                errorCode = res.errorCode ?? String(httpStatus);
                reason = res.reason ?? reason;
                details = res.details ?? null;
            }
        } else {
            // 시스템 에러
            this.logger.error(
                `🚨 [Unexpected Error] ${path}`,
                exception instanceof Error ? exception.stack : String(exception)
            );

            errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
            reason = ErrorMap.COMMON500.message;
        }

        const result = CommonResponse.fail(errorCode, reason, path, details);
        if (httpStatus >= 500 && exception instanceof HttpException) {
            this.logger.error(
                `🚨 [Server Error] ${path}: ${errorCode} - ${reason}${this.formatDetails(details)}`
            );
        } else if (httpStatus < 500) {
            this.logger.warn(`⚠️ [Client Error] ${path}: ${reason}`);
        }
        httpAdapter.reply(ctx.getResponse(), result, httpStatus);
    }

    /**
     * ValidationPipe / ParseIntPipe 등 NestJS 내장 파이프에서 발생한 검증 에러인지 판별합니다.
     * class-validator 응답 형태: { message: string[], error: string, statusCode: number }
     */
    private isValidationError(exception: HttpException, response: unknown): boolean {
        if (!(exception instanceof BadRequestException)) {
            return false;
        }

        if (typeof response !== 'object' || response === null) {
            return false;
        }

        const res = response as Record<string, unknown>;
        return 'message' in res && 'statusCode' in res && !('errorCode' in res);
    }
}
