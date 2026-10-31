import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioController } from './presentation/portfolio.controller';
import { Portfolio } from './domain/portfolio.entity';
import { Experience } from '../experience/domain/experience.entity';
import { PortfolioRepository } from './infrastructure/repositories/portfolio.repository';
import { ExternalPortfolioService } from './application/services/external-portfolio.service';
import { PortfolioService } from './application/services/portfolio.service';

@Module({
    imports: [TypeOrmModule.forFeature([Portfolio, Experience])],
    controllers: [PortfolioController],
    providers: [PortfolioRepository, ExternalPortfolioService, PortfolioService],
    exports: [ExternalPortfolioService, PortfolioService],
})
export class PortfolioModule {}
