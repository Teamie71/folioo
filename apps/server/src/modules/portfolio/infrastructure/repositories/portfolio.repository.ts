import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Portfolio } from '../../domain/portfolio.entity';
import { SourceType } from '../../domain/enums/source-type.enum';

@Injectable()
export class PortfolioRepository {
    constructor(
        @InjectRepository(Portfolio)
        private readonly portfolioRepository: Repository<Portfolio>
    ) {}

    save(portfolio: Portfolio): Promise<Portfolio> {
        return this.portfolioRepository.save(portfolio);
    }

    saveAll(portfolios: Portfolio[]): Promise<Portfolio[]> {
        return this.portfolioRepository.save(portfolios);
    }

    async findByIdWithExperience(id: number): Promise<Portfolio | null> {
        return this.portfolioRepository.findOne({
            where: { id },
            relations: { experience: true, user: true },
        });
    }

    async findInternalByIdAndUserId(id: number, userId: number): Promise<Portfolio | null> {
        return this.portfolioRepository.findOne({
            where: {
                id,
                user: { id: userId },
                sourceType: SourceType.INTERNAL,
            },
            relations: { experience: true },
        });
    }

    async findExternalById(portfolioId: number): Promise<Portfolio | null> {
        return this.portfolioRepository.findOne({
            where: {
                id: portfolioId,
                sourceType: SourceType.EXTERNAL,
            },
        });
    }

    async findExternalByIdAndUserId(
        portfolioId: number,
        userId: number
    ): Promise<Portfolio | null> {
        return this.portfolioRepository.findOne({
            where: {
                id: portfolioId,
                sourceType: SourceType.EXTERNAL,
                user: { id: userId },
            },
        });
    }

    async findByIdsAndUserId(ids: number[], userId: number): Promise<Portfolio[]> {
        if (ids.length === 0) return [];
        return this.portfolioRepository.find({
            where: {
                id: In(ids),
                user: { id: userId },
            },
        });
    }

    async findByIds(ids: number[]): Promise<Portfolio[]> {
        if (ids.length === 0) return [];
        return this.portfolioRepository.find({
            where: {
                id: In(ids),
            },
        });
    }

    async deleteById(portfolioId: number): Promise<void> {
        await this.portfolioRepository.delete(portfolioId);
    }
}
