/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars */
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { HttpAiSseRelayAdapter } from './http-ai-sse-relay.adapter';

class HttpServiceStub {
    readonly axiosRef = {
        post: jest.fn(),
        get: jest.fn(),
    };
}

class ConfigServiceStub {
    readonly mockGet = jest.fn();

    get<T>(key: string): T | undefined {
        return this.mockGet(key) as T | undefined;
    }
}

describe('HttpAiSseRelayAdapter', () => {
    let adapter: HttpAiSseRelayAdapter;
    let httpServiceStub: HttpServiceStub;
    let configServiceStub: ConfigServiceStub;

    beforeEach(() => {
        httpServiceStub = new HttpServiceStub();
        configServiceStub = new ConfigServiceStub();
        adapter = new HttpAiSseRelayAdapter(
            httpServiceStub as unknown as HttpService,
            configServiceStub as unknown as ConfigService
        );
    });

    describe('getJson', () => {
        it('includes X-API-Key header when AI_SERVICE_API_KEY is configured', async () => {
            configServiceStub.mockGet.mockImplementation((key: string) => {
                if (key === 'AI_BASE_URL') return 'https://ai.example.com';
                if (key === 'AI_SERVICE_API_KEY') return 'test-api-key-456';
                return undefined;
            });

            httpServiceStub.axiosRef.get.mockResolvedValue({
                data: { result: 'success' },
                status: 200,
                headers: {},
            });

            const result = await adapter.getJson({
                path: '/api/test',
                query: { param: 'value' },
            });

            expect(httpServiceStub.axiosRef.get).toHaveBeenCalledWith(
                'https://ai.example.com/api/test',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-API-Key': 'test-api-key-456',
                    }),
                })
            );
        });

        it('merges X-API-Key with existing request headers', async () => {
            configServiceStub.mockGet.mockImplementation((key: string) => {
                if (key === 'AI_BASE_URL') return 'https://ai.example.com';
                if (key === 'AI_SERVICE_API_KEY') return 'test-key';
                return undefined;
            });

            httpServiceStub.axiosRef.get.mockResolvedValue({
                data: {},
                status: 200,
                headers: {},
            });

            await adapter.getJson({
                path: '/api/test',
                headers: {
                    'Custom-Header': 'custom-value',
                },
            });

            expect(httpServiceStub.axiosRef.get).toHaveBeenCalledWith(
                'https://ai.example.com/api/test',

                expect.objectContaining({
                    headers: {
                        'Custom-Header': 'custom-value',
                        'X-API-Key': 'test-key',
                    },
                })
            );
        });

        it('throws BusinessException when AI_SERVICE_API_KEY is not configured', async () => {
            configServiceStub.mockGet.mockImplementation((key: string) => {
                if (key === 'AI_BASE_URL') return 'https://ai.example.com';
                if (key === 'AI_SERVICE_API_KEY') return undefined;
                return undefined;
            });

            await expect(
                adapter.getJson({
                    path: '/api/test',
                })
            ).rejects.toThrow(BusinessException);

            await expect(
                adapter.getJson({
                    path: '/api/test',
                })
            ).rejects.toMatchObject({
                response: expect.objectContaining({
                    errorCode: ErrorCode.INTERVIEW_AI_RELAY_FAILED,
                }),
            });
        });
    });
});
