import {
    AiPdfExtractAccepted,
    AiPdfExtractPort,
    DEFAULT_AI_PDF_EXTRACTION_ACCEPTED_MESSAGE,
} from 'src/common/ports/ai-pdf-extract.port';
import { PdfExtractService } from './pdf-extract.service';

class AiPdfExtractPortStub extends AiPdfExtractPort {
    readonly extractTextMock = jest.fn<Promise<AiPdfExtractAccepted>, [number, Buffer, string]>();

    extractText(
        correctionId: number,
        fileBuffer: Buffer,
        fileName: string
    ): Promise<AiPdfExtractAccepted> {
        return this.extractTextMock(correctionId, fileBuffer, fileName);
    }
}

describe('PdfExtractService', () => {
    let pdfExtractService: PdfExtractService;
    let aiPdfExtractPortStub: AiPdfExtractPortStub;

    beforeEach(() => {
        aiPdfExtractPortStub = new AiPdfExtractPortStub();
        pdfExtractService = new PdfExtractService(aiPdfExtractPortStub);
    });

    it('delegates to AiPdfExtractPort and returns accepted payload', async () => {
        const correctionId = 7;
        const fileBuffer = Buffer.from('fake-pdf-content');
        const fileName = 'portfolio.pdf';
        const portResult: AiPdfExtractAccepted = {
            message: DEFAULT_AI_PDF_EXTRACTION_ACCEPTED_MESSAGE,
        };

        aiPdfExtractPortStub.extractTextMock.mockResolvedValue(portResult);

        const result = await pdfExtractService.extractText(correctionId, fileBuffer, fileName);

        expect(result).toEqual(portResult);
        expect(aiPdfExtractPortStub.extractTextMock).toHaveBeenCalledWith(
            correctionId,
            fileBuffer,
            fileName
        );
    });

    it('propagates errors from the port', async () => {
        const correctionId = 3;
        const fileBuffer = Buffer.from('bad-pdf');
        const fileName = 'broken.pdf';

        aiPdfExtractPortStub.extractTextMock.mockRejectedValue(new Error('AI server down'));

        await expect(
            pdfExtractService.extractText(correctionId, fileBuffer, fileName)
        ).rejects.toThrow('AI server down');
    });
});
