import { ApiProperty } from '@nestjs/swagger';
import { SourceType } from 'src/modules/portfolio/domain/enums/source-type.enum';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { CorrectionItem } from '../../domain/correction-item.entity';
import { CorrectionStatus } from '../../domain/enums/correction-status.enum';
import { resolveCorrectionPortfolioSource } from '../../common/utils/correction-portfolio-source.util';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject {
    [key: string]: JsonValue;
}

type DescriptionPayload = JsonObject;
type ResponsibilitiesPayload = JsonObject;
type ProblemSolvingPayload = JsonObject;
type LearningsPayload = JsonObject;

export class CorrectionResultResDTO {
    @ApiProperty({
        enum: SourceType,
        description:
            '첨삭 포트폴리오 출처. NONE→INTERNAL, GENERATING/GENERATED→EXTERNAL. FAILED는 서버 추론 로직에 따라 correction/items 데이터를 기준으로 결정됩니다.',
    })
    portfolioSource: SourceType;

    status: CorrectionStatus;
    companyName: string;
    positionName: string;
    jobDescription: string;
    companyInsight: string | null;
    highlightPoint: string | null;
    overallReview: string | null;
    items: CorrectionItemResDTO[];

    static from(correction: PortfolioCorrection, items: CorrectionItem[]): CorrectionResultResDTO {
        const dto = new CorrectionResultResDTO();
        dto.portfolioSource = resolveCorrectionPortfolioSource(correction, items);
        dto.status = correction.status;
        dto.companyName = correction.companyName;
        dto.positionName = correction.positionName;
        dto.jobDescription = correction.jobDescription;
        dto.companyInsight = correction.companyInsight;
        dto.highlightPoint = correction.highlightPoint;
        dto.overallReview = correction.overallReview;
        dto.items = items.map((item) => CorrectionItemResDTO.from(item));
        return dto;
    }
}

export class CorrectionItemResDTO {
    portfolioId: number;
    description: DescriptionPayload | null;
    responsibilities: ResponsibilitiesPayload | null;
    problemSolving: ProblemSolvingPayload | null;
    learnings: LearningsPayload | null;

    static from(item: CorrectionItem): CorrectionItemResDTO {
        const dto = new CorrectionItemResDTO();
        dto.portfolioId = item.portfolio.id;
        dto.description = item.description as DescriptionPayload;
        dto.responsibilities = item.responsibilities as ResponsibilitiesPayload;
        dto.problemSolving = item.problemSolving as ProblemSolvingPayload;
        dto.learnings = item.learnings as LearningsPayload;
        return dto;
    }
}
