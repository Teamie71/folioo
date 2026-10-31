import { SourceType } from 'src/modules/portfolio/domain/enums/source-type.enum';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { PdfExtractionStatus } from '../../domain/enums/pdf-extraction-status.enum';
import { CorrectionItem } from '../../domain/correction-item.entity';

export function resolveCorrectionPortfolioSource(
    correction: PortfolioCorrection,
    items: CorrectionItem[]
): SourceType {
    const pdf = correction.pdfExtractionStatus;

    if (pdf === PdfExtractionStatus.NONE) return SourceType.INTERNAL;
    if (pdf === PdfExtractionStatus.GENERATING || pdf === PdfExtractionStatus.GENERATED)
        return SourceType.EXTERNAL;

    return items[0]?.portfolio?.sourceType ?? SourceType.INTERNAL;
}
