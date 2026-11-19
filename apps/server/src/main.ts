import './instrument';
import { types as pgTypes } from 'pg';
import { DateTime } from 'luxon';
import { NestFactory } from '@nestjs/core';

pgTypes.setTypeParser(1114, (val: string) => DateTime.fromSQL(val, { zone: 'UTC' }).toJSDate());
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { initializeTransactionalContext } from 'typeorm-transactional';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { SentryLogger } from './common/logger/sentry.logger';

async function bootstrap() {
    initializeTransactionalContext();
    // 부트스트랩 중 로그도 SentryLogger를 거치도록 버퍼링했다가 useLogger 뒤에 내보낸다.
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
    app.useLogger(new SentryLogger());

    const configService = app.get(ConfigService);
    const corsOriginsString = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
    const corsOrigins = corsOriginsString
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    app.enableCors({
        origin: corsOrigins,
        credentials: true,
    });

    app.use(cookieParser());

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        })
    );

    await setupSwagger(app);
    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
