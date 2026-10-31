import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CorrectionStatus } from 'src/modules/portfolio-correction/domain/enums/correction-status.enum';
import { SourceType } from 'src/modules/portfolio/domain/enums/source-type.enum';
import { CorrectionItem } from 'src/modules/portfolio-correction/domain/correction-item.entity';
import { InternalCorrectionPayload } from 'src/modules/portfolio-correction/application/services/portfolio-correction.service';
import { COMPANY_INSIGHT_MAX_LENGTH } from 'src/modules/portfolio-correction/domain/portfolio-correction.entity';
import { resolveCorrectionPortfolioSource } from 'src/modules/portfolio-correction/common/utils/correction-portfolio-source.util';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject {
    [key: string]: JsonValue;
}

class InternalCorrectionItemResDTO {
    portfolioId: number;
    description: JsonObject | null;
    responsibilities: JsonObject | null;
    problemSolving: JsonObject | null;
    learnings: JsonObject | null;

    static from(item: CorrectionItem): InternalCorrectionItemResDTO {
        const dto = new InternalCorrectionItemResDTO();
        dto.portfolioId = item.portfolio.id;
        dto.description = (item.description as JsonObject) ?? null;
        dto.responsibilities = (item.responsibilities as JsonObject) ?? null;
        dto.problemSolving = (item.problemSolving as JsonObject) ?? null;
        dto.learnings = (item.learnings as JsonObject) ?? null;
        return dto;
    }
}

export class InternalCorrectionResDTO {
    id: number;

    @ApiProperty({
        enum: SourceType,
        description:
            '첨삭 포트폴리오 출처. NONE→INTERNAL, GENERATING/GENERATED→EXTERNAL. FAILED는 결과 item 기준으로 추론.',
    })
    portfolioSource: SourceType;

    @ApiProperty({ description: '연관된 사용자 ID' })
    userId: number;

    @ApiProperty({ description: '선택된 포트폴리오 ID 목록', type: [Number] })
    portfolioIds: number[];

    companyName: string;

    @ApiProperty({ description: '직무명' })
    positionName: string;

    @ApiProperty({ description: '직무 설명(JD)' })
    jobDescription: string;

    @ApiProperty({ description: '사용자가 입력한 강조 포인트', nullable: true })
    highlightPoint: string | null;

    @ApiProperty({ description: 'RAG 파이프라인이 생성한 기업 분석', nullable: true })
    companyInsight: string | null;

    @ApiProperty({ enum: CorrectionStatus })
    status: CorrectionStatus;

    @ApiProperty({ description: '첨삭 생성 결과 (완료 시 배열, 미완료 시 null)', nullable: true })
    result: InternalCorrectionItemResDTO[] | null;

    static from(payload: InternalCorrectionPayload): InternalCorrectionResDTO {
        const { correction, portfolioIds, items } = payload;
        const dto = new InternalCorrectionResDTO();
        dto.id = correction.id;
        dto.portfolioSource = resolveCorrectionPortfolioSource(correction, items);
        dto.userId = correction.user.id;
        dto.portfolioIds = portfolioIds;
        dto.companyName = correction.companyName;
        dto.positionName = correction.positionName;
        dto.jobDescription = correction.jobDescription;
        dto.highlightPoint = correction.highlightPoint ?? null;
        dto.companyInsight = correction.companyInsight ?? null;
        dto.status = correction.status;
        dto.result =
            items.length > 0 ? items.map((item) => InternalCorrectionItemResDTO.from(item)) : null;
        return dto;
    }
}

export class UpdateCorrectionStatusReqDTO {
    @IsEnum(CorrectionStatus)
    @ApiProperty({ enum: CorrectionStatus, description: '변경할 상태값' })
    status: CorrectionStatus;
}

export class UpdateCompanyInsightInternalReqDTO {
    @IsString()
    @IsNotEmpty()
    @MaxLength(COMPANY_INSIGHT_MAX_LENGTH)
    @ApiProperty({
        description: 'RAG로 생성된 기업 분석 텍스트',
        maxLength: COMPANY_INSIGHT_MAX_LENGTH,
    })
    companyInsight: string;
}
