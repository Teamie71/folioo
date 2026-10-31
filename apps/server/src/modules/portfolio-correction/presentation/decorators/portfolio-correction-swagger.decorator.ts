import { applyDecorators, Type } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { ApiCommonResponse, ApiCommonResponseArray } from 'src/common/decorators/swagger.decorator';

export function ApiExternalPortfolioExtractRequest() {
    return applyDecorators(
        ApiConsumes('multipart/form-data'),
        ApiBody({
            schema: {
                type: 'object',
                properties: {
                    correctionId: {
                        type: 'number',
                        example: 1,
                    },
                    file: {
                        type: 'string',
                        format: 'binary',
                    },
                },
                required: ['correctionId', 'file'],
            },
        })
    );
}

export function ApiKeywordListResponse<T extends Type<unknown>>(model: T) {
    return applyDecorators(
        ApiQuery({
            name: 'keyword',
            required: false,
            description: '제목 기준 검색 키워드',
        }),
        ApiCommonResponseArray(model)
    );
}

export function ApiCorrectionIdListResponse<T extends Type<unknown>>(model: T) {
    return applyDecorators(
        ApiQuery({
            name: 'correctionId',
            required: true,
            type: Number,
            description: '조회할 첨삭 ID',
        }),
        ApiCommonResponseArray(model)
    );
}

export function ApiCorrectionIdResponse<T extends Type<unknown>>(model: T) {
    return applyDecorators(
        ApiQuery({
            name: 'correctionId',
            required: true,
            type: Number,
            description: '조회할 첨삭 ID',
        }),
        ApiCommonResponse(model)
    );
}
