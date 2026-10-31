import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import {
    COMPANY_INSIGHT_MAX_LENGTH,
    PortfolioCorrection,
} from '../../domain/portfolio-correction.entity';
import { CorrectionStatus } from '../../domain/enums/correction-status.enum';

export class UpdateCompanyInsightReqDTO {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MaxLength(COMPANY_INSIGHT_MAX_LENGTH)
    @ApiProperty({ required: false, nullable: true, maxLength: COMPANY_INSIGHT_MAX_LENGTH })
    companyInsight?: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MaxLength(200)
    @ApiProperty({ required: false, nullable: true, maxLength: 200 })
    highlightPoint?: string;
}

export class UpdateCompanyInsightResDTO {
    @ApiProperty({ nullable: true })
    id: number;

    @ApiProperty({ enum: CorrectionStatus })
    status: CorrectionStatus;

    @ApiProperty({ nullable: true, maxLength: COMPANY_INSIGHT_MAX_LENGTH })
    companyInsight: string | null;

    @ApiProperty({ nullable: true, maxLength: 200 })
    highlightPoint: string | null;

    static from(correction: PortfolioCorrection): UpdateCompanyInsightResDTO {
        const dto = new UpdateCompanyInsightResDTO();
        dto.id = correction.id;
        dto.status = correction.status;
        dto.companyInsight = correction.companyInsight;
        dto.highlightPoint = correction.highlightPoint;
        return dto;
    }
}
