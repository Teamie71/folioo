import { Inject, Injectable } from '@nestjs/common';
import { AiPdfExtractAccepted, AiPdfExtractPort } from 'src/common/ports/ai-pdf-extract.port';

@Injectable()
export class PdfExtractService {
    constructor(
        @Inject(AiPdfExtractPort)
        private readonly aiPdfExtractPort: AiPdfExtractPort
    ) {}

    async extractText(
        correctionId: number,
        fileBuffer: Buffer,
        fileName: string
    ): Promise<AiPdfExtractAccepted> {
        return this.aiPdfExtractPort.extractText(correctionId, fileBuffer, fileName);
    }
}
