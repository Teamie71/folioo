import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';
import { PdfExtractionStatus } from '../../domain/enums/pdf-extraction-status.enum';
import { normalizeOriginalFileName } from '../../common/utils/original-file-name-normalizer.util';

export class StructuredPortfolioResDTO {
    portfolioId: number;
    name: string;
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;

    static from(portfolio: Portfolio): StructuredPortfolioResDTO {
        const dto = new StructuredPortfolioResDTO();
        dto.portfolioId = portfolio.id;
        dto.name = portfolio.name;
        dto.description = portfolio.description;
        dto.responsibilities = portfolio.responsibilities;
        dto.problemSolving = portfolio.problemSolving;
        dto.learnings = portfolio.learnings;
        return dto;
    }
}

export class ExternalPortfolioListResDTO {
    @ApiProperty({ enum: PdfExtractionStatus })
    status: PdfExtractionStatus;

    @ApiProperty({ nullable: true })
    originalFileName: string | null;

    @ApiProperty({ type: [StructuredPortfolioResDTO] })
    portfolios: StructuredPortfolioResDTO[];

    static from(
        status: PdfExtractionStatus,
        originalFileName: string | null,
        portfolios: Portfolio[]
    ): ExternalPortfolioListResDTO {
        const dto = new ExternalPortfolioListResDTO();
        dto.status = status;
        dto.originalFileName = originalFileName
            ? normalizeOriginalFileName(originalFileName)
            : null;
        dto.portfolios = portfolios.map((portfolio) => StructuredPortfolioResDTO.from(portfolio));
        return dto;
    }
}

export class CreateExternalPortfolioReqDTO {
    @IsInt()
    @IsPositive()
    correctionId: number;
}

export class UpdatePortfolioBlockReqDTO {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(20)
    name?: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(300)
    description?: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(700)
    responsibilities?: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(700)
    problemSolving?: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(300)
    learnings?: string;
}
