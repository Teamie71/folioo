import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { CommonResponse, ErrorPayload } from '../dtos/common-response.dto';
import { ErrorMap } from '../exceptions/error-code';
import { ErrorCode } from '../exceptions/error-code.enum';

const baseResponseSchema = {
    timestamp: { type: 'string', example: '2024-01-02T12:34:56.000Z' },
    isSuccess: { type: 'boolean', example: true },
    error: { type: 'object', nullable: true, example: null },
};

interface ApiCommonResponseOptions {
    description?: string;
    exampleResult?: unknown;
    exampleResults?: Record<
        string,
        {
            summary: string;
            result: unknown;
        }
    >;
    status?: number;
}

// 단일 객체 응답
export const ApiCommonResponse = <T extends Type<unknown> | null>(
    model: T,
    options?: ApiCommonResponseOptions
) => {
    const schema: {
        properties: {
            timestamp: { type: string; example: string };
            isSuccess: { type: string; example: boolean };
            error: { type: string; nullable: boolean; example: null };
            result: { $ref?: string; type?: string; example?: unknown };
        };
        example?: {
            timestamp: string;
            isSuccess: boolean;
            error: null;
            result: unknown;
        };
    } = {
        properties: {
            ...baseResponseSchema,
            result: model
                ? {
                      $ref: getSchemaPath(model),
                  }
                : {
                      type: 'object',
                  },
        },
    };

    if (options?.exampleResult !== undefined && !options.exampleResults) {
        schema.example = {
            timestamp: '2024-01-02T12:34:56.000Z',
            isSuccess: true,
            error: null,
            result: options.exampleResult,
        };
    }

    const successExamples = options?.exampleResults
        ? Object.entries(options.exampleResults).reduce<
              Record<
                  string,
                  {
                      summary: string;
                      value: {
                          timestamp: string;
                          isSuccess: boolean;
                          error: null;
                          result: unknown;
                      };
                  }
              >
          >((acc, [key, example]) => {
              acc[key] = {
                  summary: example.summary,
                  value: {
                      timestamp: '2024-01-02T12:34:56.000Z',
                      isSuccess: true,
                      error: null,
                      result: example.result,
                  },
              };
              return acc;
          }, {})
        : undefined;

    const decorators = model
        ? [ApiExtraModels(CommonResponse, model)]
        : [ApiExtraModels(CommonResponse)];

    return applyDecorators(
        ...decorators,
        ApiResponse({
            status: options?.status ?? HttpStatus.OK,
            description: options?.description ?? '성공 응답',
            ...(successExamples
                ? {
                      content: {
                          'application/json': {
                              schema,
                              examples: successExamples,
                          },
                      },
                  }
                : { schema }),
        })
    );
};

type ApiCommonMessageResponseOptions = Omit<ApiCommonResponseOptions, 'exampleResult'>;

export const ApiCommonMessageResponse = (
    message: string,
    options?: ApiCommonMessageResponseOptions
) => {
    return ApiCommonResponse(null, {
        ...options,
        exampleResult: message,
    });
};

// 배열 응답
export const ApiCommonResponseArray = <T extends Type<unknown>>(model: T) => {
    return applyDecorators(
        ApiExtraModels(CommonResponse, model),
        ApiResponse({
            status: HttpStatus.OK,
            description: '성공 응답',
            schema: {
                properties: {
                    ...baseResponseSchema,
                    result: {
                        type: 'array',
                        items: { $ref: getSchemaPath(model) },
                    },
                },
            },
        })
    );
};

interface SwaggerExampleValue {
    summary: string;
    value: {
        timestamp: string;
        isSuccess: boolean;
        result: null;
        error: {
            errorCode: ErrorCode;
            reason: string;
            details: null;
            path: string;
        };
    };
}

type ErrorsByStatus = Record<number, Record<string, SwaggerExampleValue>>;

// 에러 응답
export const ApiCommonErrorResponse = (...errorCodes: ErrorCode[]) => {
    const errorsByStatus = errorCodes.reduce<ErrorsByStatus>((acc, errorCode) => {
        const errorInfo = ErrorMap[errorCode];
        const status = errorInfo.statusCode;

        if (!acc[status]) {
            acc[status] = {};
        }

        acc[status][errorCode] = {
            summary: errorInfo.message,
            value: {
                timestamp: '2024-01-02T12:34:56.000Z',
                isSuccess: false,
                result: null,
                error: {
                    errorCode: errorCode,
                    reason: errorInfo.message,
                    details: null,
                    path: '/path/to/your/api',
                },
            },
        };
        return acc;
    }, {});

    const decorators = Object.entries(errorsByStatus).map(([status, examples]) => {
        return ApiResponse({
            status: Number(status),
            description: 'Error Response',
            content: {
                'application/json': {
                    schema: {
                        $ref: getSchemaPath(CommonResponse),
                    },
                    examples: examples,
                },
            },
        });
    });

    return applyDecorators(ApiExtraModels(CommonResponse, ErrorPayload), ...decorators);
};
