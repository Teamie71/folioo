import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryModule } from '@sentry/nestjs/setup';
import { TypeOrmConfigService } from './config/typeorm-config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { PortfolioCorrectionModule } from './modules/portfolio-correction/portfolio-correction.module';
import { EventModule } from './modules/event/event.module';
import { InternalModule } from './modules/internal/internal.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { BlockModule } from './modules/block/block.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { KakaoChannelModule } from './modules/kakao-channel/kakao-channel.module';
import { addTransactionalDataSource, getDataSourceByName } from 'typeorm-transactional';
import { DataSource } from 'typeorm';

@Module({
    imports: [
        SentryModule.forRoot(),
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        TypeOrmModule.forRootAsync({
            useClass: TypeOrmConfigService,
            dataSourceFactory(options) {
                if (!options) {
                    throw new Error('Invalid options passed');
                }

                return Promise.resolve(
                    getDataSourceByName('default') ||
                        addTransactionalDataSource(new DataSource(options))
                );
            },
        }),
        ScheduleModule.forRoot(),
        AuthModule,
        UserModule,
        PortfolioModule,
        PortfolioCorrectionModule,
        EventModule,
        FeedbackModule,
        BlockModule,
        AssessmentModule,
        InternalModule,
        KakaoChannelModule,
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: GlobalExceptionFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TransformInterceptor,
        },
    ],
    controllers: [AppController],
})
export class AppModule {}
