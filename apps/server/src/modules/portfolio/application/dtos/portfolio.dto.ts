import { ApiProperty } from '@nestjs/swagger';
import { JobCategory } from 'src/modules/experience/domain/enums/job-category.enum';
import { Portfolio } from '../../domain/portfolio.entity';

export class PortfolioDetailResDTO {
    id: number;
    name: string;
    @ApiProperty({ enum: JobCategory, example: JobCategory.DEV, nullable: true })
    hopeJob: JobCategory | null;
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;
    contributionRate: number | null;
    createdAt: string;

    static from(portfolio: Portfolio): PortfolioDetailResDTO {
        const dto = new PortfolioDetailResDTO();
        dto.id = portfolio.id;
        dto.name = portfolio.name;
        dto.hopeJob = portfolio.experience?.hopeJob ?? null;
        dto.description = portfolio.description;
        dto.responsibilities = portfolio.responsibilities;
        dto.problemSolving = portfolio.problemSolving;
        dto.learnings = portfolio.learnings;
        dto.contributionRate = portfolio.contributionRate ?? null;
        dto.createdAt = portfolio.createdAt.toISOString();
        return dto;
    }
}
