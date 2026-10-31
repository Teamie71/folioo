import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { JobDescriptionType } from '../../domain/enums/jobdescription-type.enum';
import { CorrectionStatus } from '../../domain/enums/correction-status.enum';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { CorrectionPortfolioSelection } from '../../domain/correction-portfolio-selection.entity';

export class CorrectionResDTO {
    id: number;
    title: string;
    positionName: string;
    createdAt: string;

    static from(correction: PortfolioCorrection): CorrectionResDTO {
        const dto = new CorrectionResDTO();
        dto.id = correction.id;
        dto.title = correction.title;
        dto.positionName = correction.positionName;
        dto.createdAt = correction.createdAt.toISOString();
        return dto;
    }
}

export class CreateCorrectionReqDTO {
    @ApiProperty({
        description: '첨삭 제목',
        example: '백엔드 개발자 포트폴리오 첨삭',
    })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MinLength(1)
    @MaxLength(20)
    title: string;

    @ApiProperty({
        description: '지원 회사명',
        example: 'Folioo',
    })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MinLength(1)
    @MaxLength(20)
    companyName: string;

    @ApiProperty({
        description: '지원 포지션명',
        example: 'Backend Developer',
    })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MinLength(1)
    @MaxLength(20)
    positionName: string;

    @ApiProperty({
        description: '채용 공고 또는 직무 설명',
        example: 'NestJS 기반 백엔드 서비스 개발 및 운영',
        required: false,
    })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    jobDescription?: string;

    @IsEnum(JobDescriptionType)
    @ApiProperty({ enum: JobDescriptionType, example: JobDescriptionType.TEXT })
    jobDescriptionType: JobDescriptionType;
}

export class CreateCorrectionResDTO {
    correctionId: number;
    message: string;
}

export class CorrectionStatusResDTO {
    id: number;
    @ApiProperty({ enum: CorrectionStatus, example: CorrectionStatus.GENERATING })
    status: CorrectionStatus;

    static from(correction: PortfolioCorrection): CorrectionStatusResDTO {
        const dto = new CorrectionStatusResDTO();
        dto.id = correction.id;
        dto.status = correction.status;
        return dto;
    }
}

export class MapCorrectionWithPortfoliosReqDTO {
    @ApiProperty({ type: [Number], example: [1, 2, 3] })
    @IsArray()
    @ArrayNotEmpty()
    @IsNumber({}, { each: true })
    portfolioIds: number[];
}

export class CorrectionSelectionResDTO {
    portfolioId: number;
    isActive: boolean;

    static from(selection: CorrectionPortfolioSelection): CorrectionSelectionResDTO {
        const dto = new CorrectionSelectionResDTO();
        dto.portfolioId = selection.portfolio.id;
        dto.isActive = selection.isActive;
        return dto;
    }
}

export class UpdateCorrectionTitleReqDTO {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MinLength(1)
    @MaxLength(20)
    title: string;
}
