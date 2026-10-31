/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { DEFAULT_AI_PDF_EXTRACTION_ACCEPTED_MESSAGE } from 'src/common/ports/ai-pdf-extract.port';
import { HttpAiPdfExtractAdapter } from './http-ai-pdf-extract.adapter';

class HttpServiceStub {
    readonly axiosRef = {
        post: jest.fn(),
    };
}

class ConfigServiceStub {
    readonly mockGet = jest.fn();

    get<T>(key: string): T | undefined {
        return this.mockGet(key) as T | undefined;
    }
}

describe('HttpAiPdfExtractAdapter', () => {
    let adapter: HttpAiPdfExtractAdapter;
    let httpServiceStub: HttpServiceStub;
    let configServiceStub: ConfigServiceStub;

    beforeEach(() => {
        httpServiceStub = new HttpServiceStub();
        configServiceStub = new ConfigServiceStub();
        adapter = new HttpAiPdfExtractAdapter(
            httpServiceStub as unknown as HttpService,
            configServiceStub as unknown as ConfigService
        );
    });

    describe('extractText', () => {
        it('posts to corrections pdf-extraction path with X-API-Key', async () => {
            configServiceStub.mockGet.mockImplementation((key: string) => {
                if (key === 'AI_BASE_URL') return 'https://ai.example.com';
                if (key === 'AI_SERVICE_API_KEY') return 'test-extract-key-789';
                return undefined;
            });

            httpServiceStub.axiosRef.post.mockResolvedValue({
                data: {
                    correction_id: '1',
                    status: 'accepted',
                    message: DEFAULT_AI_PDF_EXTRACTION_ACCEPTED_MESSAGE,
                },
            });

            const correctionId = 42;
            const fileBuffer = Buffer.from('fake pdf content');
            const result = await adapter.extractText(correctionId, fileBuffer, 'test.pdf');

            expect(httpServiceStub.axiosRef.post).toHaveBeenCalledWith(
                'https://ai.example.com/api/v1/corrections/42/pdf-extraction',
                expect.any(FormData),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-API-Key': 'test-extract-key-789',
                    }),
                })
            );

            expect(result).toEqual({
                message: DEFAULT_AI_PDF_EXTRACTION_ACCEPTED_MESSAGE,
            });
        });

        it('throws BusinessException when AI_SERVICE_API_KEY is not configured', async () => {
            configServiceStub.mockGet.mockImplementation((key: string) => {
                if (key === 'AI_BASE_URL') return 'https://ai.example.com';
                if (key === 'AI_SERVICE_API_KEY') return undefined;
                return undefined;
            });

            const fileBuffer = Buffer.from('fake pdf content');

            await expect(adapter.extractText(1, fileBuffer, 'test.pdf')).rejects.toThrow(
                BusinessException
            );

            await expect(adapter.extractText(1, fileBuffer, 'test.pdf')).rejects.toMatchObject({
                response: expect.objectContaining({
                    errorCode: ErrorCode.PORTFOLIO_EXTRACT_FAILED,
                }),
            });
        });

        it('throws BusinessException when AI_BASE_URL is not configured', async () => {
            configServiceStub.mockGet.mockImplementation((key: string) => {
                if (key === 'AI_BASE_URL') return undefined;
                return undefined;
            });

            const fileBuffer = Buffer.from('fake pdf content');

            await expect(adapter.extractText(1, fileBuffer, 'test.pdf')).rejects.toThrow(
                BusinessException
            );
        });

        it('returns default message when accepted response omits message', async () => {
            configServiceStub.mockGet.mockImplementation((key: string) => {
                if (key === 'AI_BASE_URL') return 'https://ai.example.com';
                if (key === 'AI_SERVICE_API_KEY') return 'valid-key';
                return undefined;
            });

            httpServiceStub.axiosRef.post.mockResolvedValue({
                data: { status: 'accepted' },
            });

            const fileBuffer = Buffer.from('fake pdf content');
            const result = await adapter.extractText(99, fileBuffer, 'sample.pdf');

            expect(result).toEqual({
                message: DEFAULT_AI_PDF_EXTRACTION_ACCEPTED_MESSAGE,
            });
        });

        it('throws when response is not accepted (e.g. legacy extracted_text only)', async () => {
            configServiceStub.mockGet.mockImplementation((key: string) => {
                if (key === 'AI_BASE_URL') return 'https://ai.example.com';
                if (key === 'AI_SERVICE_API_KEY') return 'valid-key';
                return undefined;
            });

            httpServiceStub.axiosRef.post.mockResolvedValue({
                data: { extracted_text: 'sync no longer supported' },
            });

            const fileBuffer = Buffer.from('fake pdf content');
            await expect(adapter.extractText(1, fileBuffer, 'x.pdf')).rejects.toThrow(
                BusinessException
            );
        });
    });
});
