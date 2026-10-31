import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import {
    AiPdfExtractAccepted,
    AiPdfExtractPort,
    DEFAULT_AI_PDF_EXTRACTION_ACCEPTED_MESSAGE,
} from 'src/common/ports/ai-pdf-extract.port';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

/** AI server: POST /api/v1/corrections/{correction_id}/pdf-extraction */
function buildExtractPath(correctionId: number): string {
    return `/api/v1/corrections/${correctionId}/pdf-extraction`;
}

@Injectable()
export class HttpAiPdfExtractAdapter extends AiPdfExtractPort {
    private readonly logger = new Logger(HttpAiPdfExtractAdapter.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        super();
    }

    async extractText(
        correctionId: number,
        fileBuffer: Buffer,
        fileName: string
    ): Promise<AiPdfExtractAccepted> {
        const baseUrl = this.configService.get<string>('AI_BASE_URL');
        if (!baseUrl) {
            this.logger.error('AI_BASE_URL is not configured');
            throw new BusinessException(ErrorCode.PORTFOLIO_EXTRACT_FAILED);
        }

        const apiKey = this.configService.get<string>('AI_SERVICE_API_KEY');
        if (!apiKey) {
            this.logger.error('AI_SERVICE_API_KEY is not configured');
            throw new BusinessException(ErrorCode.PORTFOLIO_EXTRACT_FAILED);
        }

        const requestUrl = this.buildRequestUrl(baseUrl, buildExtractPath(correctionId));
        const formData = this.buildFormData(fileBuffer, fileName);

        try {
            const response = await this.httpService.axiosRef.post<unknown>(requestUrl, formData, {
                timeout: 60_000,
                headers: {
                    'X-API-Key': apiKey,
                },
            });

            const parsed = this.parseExtractResponse(response.data);
            if (!parsed) {
                this.logger.error(
                    `Unexpected AI extract response shape: ${JSON.stringify(response.data)}`
                );
                throw new BusinessException(ErrorCode.PORTFOLIO_EXTRACT_FAILED);
            }

            return parsed;
        } catch (error: unknown) {
            if (error instanceof BusinessException) {
                throw error;
            }

            if (isAxiosError(error)) {
                this.logger.error(`AI server request failed: ${error.message}`, {
                    status: error.response?.status,
                    data: this.safeStringify(error.response?.data),
                });
                throw new BusinessException(ErrorCode.PORTFOLIO_EXTRACT_FAILED);
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown extract error';
            this.logger.error(`Failed to extract text from PDF via AI server: ${errorMessage}`);
            throw new BusinessException(ErrorCode.PORTFOLIO_EXTRACT_FAILED);
        }
    }

    private buildRequestUrl(baseUrl: string, path: string): string {
        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${normalizedBaseUrl}${normalizedPath}`;
    }

    private buildFormData(fileBuffer: Buffer, fileName: string): FormData {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' });
        formData.append('file', blob, fileName);
        return formData;
    }

    private safeStringify(value: unknown): string {
        try {
            return JSON.stringify(value);
        } catch {
            return '[unserializable-response-data]';
        }
    }

    private parseExtractResponse(data: unknown): AiPdfExtractAccepted | null {
        if (!data || typeof data !== 'object') {
            return null;
        }
        const body = data as Record<string, unknown>;

        const status = body.status;
        if (typeof status === 'string' && status.toLowerCase() === 'accepted') {
            const message =
                typeof body.message === 'string'
                    ? body.message
                    : DEFAULT_AI_PDF_EXTRACTION_ACCEPTED_MESSAGE;
            return { message };
        }

        return null;
    }
}
