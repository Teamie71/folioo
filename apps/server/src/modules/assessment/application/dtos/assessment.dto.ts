import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsInt,
    IsOptional,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';
import { ValueKind } from '../../domain/enums/value-kind.enum';
import { AssessmentResult } from '../../domain/assessment-result.entity';
import { MajorField } from '../../domain/enums/major-field.enum';
import { TraitKind } from '../../domain/enums/trait-kind.enum';
import { SCALE_MAX, SCALE_MIN } from '../../constants/scoring.constant';
import { TRAIT_ANSWER_COUNT } from '../../constants/traits.constant';
import type { ScoredCompanyType, ScoredJob, TraitVector } from '../../domain/types';

export class TraitAnswerReqDTO {
    @IsInt()
    @Min(1)
    @Max(TRAIT_ANSWER_COUNT)
    @ApiProperty({ description: '문항 번호 (1~15)' })
    questionNo: number;

    @IsInt()
    @Min(SCALE_MIN)
    @Max(SCALE_MAX)
    @ApiProperty({
        description: `응답 값 (${SCALE_MIN}~${SCALE_MAX}). "그렇다"=${SCALE_MAX}(해당 특성이 강함), "그렇지 않다"=${SCALE_MIN}`,
    })
    value: number;
}

export class CreateAssessmentReqDTO {
    @IsArray()
    @ArrayMinSize(TRAIT_ANSWER_COUNT)
    @ArrayMaxSize(TRAIT_ANSWER_COUNT)
    @ValidateNested({ each: true })
    @Type(() => TraitAnswerReqDTO)
    @ApiProperty({ type: [TraitAnswerReqDTO], description: '성향 문항 15개에 대한 응답' })
    traitAnswers: TraitAnswerReqDTO[];

    @IsArray()
    @ArrayMinSize(5)
    @ArrayMaxSize(5)
    @IsEnum(ValueKind, { each: true })
    @ApiProperty({
        type: [String],
        enum: ValueKind,
        description: '가치관 밸런스게임으로 확정된 1위~5위 순위',
    })
    valueRanking: ValueKind[];

    @IsOptional()
    @IsEnum(MajorField)
    @ApiProperty({
        enum: MajorField,
        nullable: true,
        description: '전공 계열. 전공 무관이면 null',
    })
    majorField: MajorField | null;
}

class ScoredJobResDTO {
    @ApiProperty()
    code: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ description: '적합도(%)' })
    matchRate: number;

    @ApiProperty()
    summary: string;

    @ApiProperty({ type: [String] })
    coreSkills: string[];

    @ApiProperty({ type: [String] })
    recommendedActivities: string[];

    static from(job: ScoredJob): ScoredJobResDTO {
        const dto = new ScoredJobResDTO();
        dto.code = job.code;
        dto.name = job.name;
        dto.matchRate = job.matchRate;
        dto.summary = job.summary;
        dto.coreSkills = job.coreSkills;
        dto.recommendedActivities = job.recommendedActivities;
        return dto;
    }
}

class ScoredCompanyTypeResDTO {
    @ApiProperty()
    code: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    matchRate: number;

    @ApiProperty()
    description: string;

    @ApiProperty({ nullable: true })
    tip: string | null;

    static from(companyType: ScoredCompanyType): ScoredCompanyTypeResDTO {
        const dto = new ScoredCompanyTypeResDTO();
        dto.code = companyType.code;
        dto.name = companyType.name;
        dto.matchRate = companyType.matchRate;
        dto.description = companyType.description;
        dto.tip = companyType.tip;
        return dto;
    }
}

export class AssessmentResultResDTO {
    @ApiProperty()
    uuid: string;

    @ApiProperty({ description: '최고점 가치관×성향 조합에 대한 헤드라인 문구' })
    headline: string;

    @ApiProperty({
        enum: MajorField,
        nullable: true,
        description: '생성 시 선택한 전공 계열. 전공 무관이면 null',
    })
    majorField: MajorField | null;

    @ApiProperty({
        enum: TraitKind,
        description: '특성별 성향 점수 (레이더 차트용)',
        example: {
            INVESTIGATIVE: 4.5,
            SOCIAL: 5.0,
            ENTERPRISING: 4.0,
            CONVENTIONAL: 2.0,
            REALISTIC: 4.0,
            ARTISTIC: 5.0,
        },
    })
    traitVector: TraitVector;

    @ApiProperty({
        type: [String],
        enum: ValueKind,
        description: '선호 근무 조건(가치관 밸런스게임 결과) 1위~5위 순위',
    })
    valueRanking: ValueKind[];

    @ApiProperty({ type: [ScoredJobResDTO] })
    topJobs: ScoredJobResDTO[];

    @ApiProperty({ type: ScoredCompanyTypeResDTO })
    companyType: ScoredCompanyTypeResDTO;

    @ApiProperty({ nullable: true, description: '계정에 등록(claim)된 시각' })
    claimedAt: string | null;

    @ApiProperty()
    createdAt: string;

    // uuid만 있으면 로그인 여부와 무관하게 항상 전체 내용을 내려준다(공유 링크 = 누구나 열람).
    // AssessmentResult 자체가 생성 시점 값을 그대로 복사해둔 스냅샷이라 별도 공유용 스냅샷은 필요 없다.
    static from(result: AssessmentResult): AssessmentResultResDTO {
        const dto = new AssessmentResultResDTO();
        dto.uuid = result.uuid;
        dto.headline = result.headline;
        dto.majorField = result.inputSnapshot.majorField as MajorField | null;
        dto.traitVector = result.traitVector;
        dto.valueRanking = result.valueRanking;
        dto.topJobs = result.topJobs.map((job) => ScoredJobResDTO.from(job));
        dto.companyType = ScoredCompanyTypeResDTO.from(result.companyType);
        dto.claimedAt = result.claimedAt?.toISOString() ?? null;
        dto.createdAt = result.createdAt.toISOString();
        return dto;
    }
}

export class AssessmentStatusResDTO {
    @ApiProperty({ description: '이 계정으로 완료(생성 또는 claim)한 분석 결과가 있는지 여부' })
    hasCompleted: boolean;

    @ApiProperty({ nullable: true, description: '가장 최근 결과의 uuid(조회/공유용). 없으면 null' })
    uuid: string | null;

    static from(result: AssessmentResult | null): AssessmentStatusResDTO {
        const dto = new AssessmentStatusResDTO();
        dto.hasCompleted = result !== null;
        dto.uuid = result?.uuid ?? null;
        return dto;
    }
}
