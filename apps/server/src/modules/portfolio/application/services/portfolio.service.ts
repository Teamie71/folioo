import { Injectable } from '@nestjs/common';
import { PortfolioRepository } from '../../infrastructure/repositories/portfolio.repository';
import { Portfolio } from '../../domain/portfolio.entity';
import { PortfolioDetailResDTO } from '../dtos/portfolio.dto';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { SourceType } from '../../domain/enums/source-type.enum';

@Injectable()
export class PortfolioService {
    constructor(private readonly portfolioRepository: PortfolioRepository) {}

    async findByIdOrThrow(id: number, userId: number): Promise<Portfolio> {
        const portfolio = await this.portfolioRepository.findInternalByIdAndUserId(id, userId);
        if (!portfolio) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return portfolio;
    }

    async findByIdWithExperienceOrThrow(id: number): Promise<Portfolio> {
        const portfolio = await this.portfolioRepository.findByIdWithExperience(id);
        if (!portfolio) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return portfolio;
    }

    async getPortfolio(portfolioId: number, userId: number): Promise<PortfolioDetailResDTO> {
        const portfolio = await this.findByIdOrThrow(portfolioId, userId);
        return PortfolioDetailResDTO.from(portfolio);
    }

    async findByIdsAndUserIdOrThrow(portfolioIds: number[], userId: number): Promise<Portfolio[]> {
        const uniqueIds = [...new Set(portfolioIds)];
        const portfolios = await this.portfolioRepository.findByIdsAndUserId(uniqueIds, userId);
        if (portfolios.length !== uniqueIds.length) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return portfolios;
    }

    async findByIds(portfolioIds: number[]): Promise<Portfolio[]> {
        return this.portfolioRepository.findByIds(portfolioIds);
    }

    private validateInternalPortfolios(portfolios: Portfolio[]): void {
        const hasExternal = portfolios.some(
            (portfolio) => portfolio.sourceType !== SourceType.INTERNAL
        );
        if (hasExternal) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
    }

    async findInternalByIdsAndUserIdOrThrow(
        portfolioIds: number[],
        userId: number
    ): Promise<Portfolio[]> {
        const portfolios = await this.findByIdsAndUserIdOrThrow(portfolioIds, userId);
        this.validateInternalPortfolios(portfolios);
        return portfolios;
    }

    async findInternalByIdsOrThrow(portfolioIds: number[]): Promise<Portfolio[]> {
        const uniqueIds = [...new Set(portfolioIds)];
        const portfolios = await this.findByIds(uniqueIds);
        if (portfolios.length !== uniqueIds.length) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        this.validateInternalPortfolios(portfolios);
        return portfolios;
    }
}
