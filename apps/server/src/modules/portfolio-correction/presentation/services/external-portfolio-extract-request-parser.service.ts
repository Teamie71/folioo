import { Injectable } from '@nestjs/common';
import Busboy from 'busboy';
import type { IncomingHttpHeaders } from 'http';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { normalizeOriginalFileName } from '../../common/utils/original-file-name-normalizer.util';

const MULTIPART_CONTENT_TYPE = 'multipart/form-data';
const PDF_MIME_TYPE = 'application/pdf';
const PDF_SIGNATURE = '%PDF';
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

export interface MultipartRequestLike {
    headers: IncomingHttpHeaders;
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T;
    unpipe(destination?: NodeJS.WritableStream): this;
}

export interface ExtractPortfolioUpload {
    correctionId: number;
    fileBuffer: Buffer;
    fileName: string;
}

@Injectable()
export class ExternalPortfolioExtractRequestParserService {
    async parse(req: MultipartRequestLike): Promise<ExtractPortfolioUpload> {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes(MULTIPART_CONTENT_TYPE)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'content-type must be multipart/form-data',
            });
        }

        return new Promise((resolve, reject) => {
            const parser = Busboy({
                headers: req.headers,
                limits: {
                    files: 10,
                    fields: 10,
                    fileSize: MAX_PDF_SIZE_BYTES,
                },
            });

            const chunks: Buffer[] = [];
            let parsedCorrectionId: number | null = null;
            let parsedFileName: string | null = null;
            let hasFile = false;
            let settled = false;

            const fail = (errorCode: ErrorCode, detail: Record<string, unknown>): void => {
                if (settled) {
                    return;
                }
                settled = true;
                req.unpipe(parser);
                reject(new BusinessException(errorCode, detail));
            };

            parser.on('field', (fieldName, value) => {
                if (fieldName !== 'correctionId') {
                    return;
                }

                const correctionId = Number.parseInt(value, 10);
                if (!Number.isInteger(correctionId) || correctionId <= 0) {
                    fail(ErrorCode.BAD_REQUEST, {
                        reason: 'correctionId must be a positive integer',
                    });
                    return;
                }

                parsedCorrectionId = correctionId;
            });

            parser.on('file', (fieldName, fileStream, info) => {
                if (fieldName !== 'file') {
                    fileStream.resume();
                    return;
                }

                if (hasFile) {
                    fileStream.resume();
                    fail(ErrorCode.BAD_REQUEST, { reason: 'only one file is allowed' });
                    return;
                }

                if (info.mimeType !== PDF_MIME_TYPE) {
                    fileStream.resume();
                    fail(ErrorCode.BAD_REQUEST, {
                        reason: 'only application/pdf is allowed',
                        mimeType: info.mimeType,
                    });
                    return;
                }

                hasFile = true;
                parsedFileName = info.filename
                    ? normalizeOriginalFileName(info.filename)
                    : 'upload.pdf';

                fileStream.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                fileStream.on('limit', () => {
                    fileStream.resume();
                    fail(ErrorCode.BAD_REQUEST, {
                        reason: 'file size exceeds 10MB limit',
                    });
                });

                fileStream.on('error', () => {
                    fail(ErrorCode.PORTFOLIO_EXTRACT_FAILED, {
                        reason: 'failed while reading uploaded file stream',
                    });
                });
            });

            parser.on('filesLimit', () => {
                fail(ErrorCode.BAD_REQUEST, { reason: 'too many file fields were provided' });
            });

            parser.on('error', () => {
                fail(ErrorCode.PORTFOLIO_EXTRACT_FAILED, {
                    reason: 'failed to parse multipart payload',
                });
            });

            parser.on('finish', () => {
                if (settled) {
                    return;
                }

                if (!hasFile || !parsedFileName) {
                    fail(ErrorCode.BAD_REQUEST, { reason: 'file is required' });
                    return;
                }

                if (parsedCorrectionId === null) {
                    fail(ErrorCode.BAD_REQUEST, { reason: 'correctionId is required' });
                    return;
                }

                const fileBuffer = Buffer.concat(chunks);
                const pdfSignature = fileBuffer.subarray(0, 4).toString();
                if (pdfSignature !== PDF_SIGNATURE) {
                    fail(ErrorCode.BAD_REQUEST, { reason: 'uploaded file is not a valid PDF' });
                    return;
                }

                settled = true;
                resolve({
                    correctionId: parsedCorrectionId,
                    fileBuffer,
                    fileName: parsedFileName,
                });
            });

            req.pipe(parser);
        });
    }
}
