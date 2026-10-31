/**
 * AI 서버가 PDF 추출 작업을 접수했을 때의 응답.
 * 구조화된 결과는 internal `pdf-extraction-result` 콜백으로 수신한다.
 */

/** AI 응답 본문에 `message`가 없을 때 사용하는 기본 안내 문구 */
export const DEFAULT_AI_PDF_EXTRACTION_ACCEPTED_MESSAGE = 'PDF 추출 요청이 접수되었습니다.';

export type AiPdfExtractAccepted = {
    message: string;
};

export abstract class AiPdfExtractPort {
    abstract extractText(
        correctionId: number,
        fileBuffer: Buffer,
        fileName: string
    ): Promise<AiPdfExtractAccepted>;
}
