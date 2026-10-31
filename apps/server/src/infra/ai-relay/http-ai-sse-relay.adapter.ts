import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    AiRelayGetRequest,
    AiRelayJsonResponse,
    AiRelayPort,
    AiRelayRequest,
} from 'src/common/ports/ai-relay.port';

@Injectable()
export class HttpAiSseRelayAdapter extends AiRelayPort {
    private readonly logger = new Logger(HttpAiSseRelayAdapter.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        super();
    }

    async getJson<T = unknown>(request: AiRelayGetRequest): Promise<AiRelayJsonResponse<T>> {
        const { baseUrl, apiKey } = this.getAiServiceConfig();

        const requestUrl = this.buildRequestUrl(baseUrl, request.path);

        try {
            const response: AxiosResponse<T> = await this.httpService.axiosRef.get<T>(requestUrl, {
                params: request.query,
                headers: {
                    ...request.headers,
                    'X-API-Key': apiKey,
                },
                timeout: request.timeoutMs ?? 30_000,
                ...(request.returnHttpErrors
                    ? { validateStatus: () => true, maxRedirects: 0 }
                    : {}),
            });

            return {
                data: response.data,
                status: response.status,
                headers: this.extractHeaders(response.headers as Record<string, unknown>),
            };
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                this.logger.error('AI JSON request failed', {
                    status,
                });
            } else {
                this.logger.error('Unknown AI JSON request failure');
            }

            throw new BusinessException(ErrorCode.INTERVIEW_AI_RELAY_FAILED);
        }
    }

    async postJson<T = unknown>(request: AiRelayRequest): Promise<AiRelayJsonResponse<T>> {
        const { baseUrl, apiKey } = this.getAiServiceConfig();
        const requestUrl = this.buildRequestUrl(baseUrl, request.path);

        try {
            const response: AxiosResponse<T> = await this.httpService.axiosRef.post<T>(
                requestUrl,
                request.body,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...request.headers,
                        'X-API-Key': apiKey,
                    },
                    timeout: request.timeoutMs ?? 30_000,
                    ...(request.returnHttpErrors
                        ? { validateStatus: () => true, maxRedirects: 0 }
                        : {}),
                }
            );

            return {
                data: response.data,
                status: response.status,
                headers: this.extractHeaders(response.headers as Record<string, unknown>),
            };
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                this.logger.error('AI POST JSON request failed', {
                    status: error.response?.status,
                });
            } else {
                this.logger.error('Unknown AI POST JSON request failure');
            }

            throw new BusinessException(ErrorCode.AI_RELAY_REQUEST_FAILED);
        }
    }

    private buildRequestUrl(baseUrl: string, path: string): string {
        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${normalizedBaseUrl}${normalizedPath}`;
    }

    private extractHeaders(headers: Record<string, unknown>): Record<string, string> {
        const normalizedHeaders: Record<string, string> = {};

        for (const [rawName, rawValue] of Object.entries(headers)) {
            const normalizedName = rawName.toLowerCase();
            const normalizedValue = this.normalizeHeaderValue(rawValue);
            if (!normalizedValue) {
                continue;
            }
            normalizedHeaders[normalizedName] = normalizedValue;
        }

        return normalizedHeaders;
    }

    private normalizeHeaderValue(value: unknown): string | null {
        if (typeof value === 'string') {
            return value;
        }

        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }

        if (Array.isArray(value)) {
            const stringValues = value.filter((item): item is string => typeof item === 'string');
            return stringValues.length > 0 ? stringValues.join(',') : null;
        }

        return null;
    }

    private getAiServiceConfig(): { baseUrl: string; apiKey: string } {
        const baseUrl = this.configService.get<string>('AI_BASE_URL');
        if (!baseUrl) {
            this.logger.error('AI_BASE_URL is not configured');
            throw new BusinessException(ErrorCode.INTERVIEW_AI_RELAY_FAILED);
        }

        const apiKey = this.configService.get<string>('AI_SERVICE_API_KEY');
        if (!apiKey) {
            this.logger.error('AI_SERVICE_API_KEY is not configured');
            throw new BusinessException(ErrorCode.INTERVIEW_AI_RELAY_FAILED);
        }

        return { baseUrl, apiKey };
    }
}
