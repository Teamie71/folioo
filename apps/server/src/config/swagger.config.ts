import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import metadata from '../metadata';
import expressBasicAuth from 'express-basic-auth';

// 문서 경로는 실제 API 경로와 겹치면 안 된다. 예전 'api'는 Basic Auth 가드가
// 접두사 매칭으로 /api/v1/* (AI 연동 API)까지 막아버렸다.
const SWAGGER_PATH = 'docs';
const SWAGGER_JSON_PATH = 'docs-json';

export async function setupSwagger(app: INestApplication): Promise<void> {
    const configService = app.get(ConfigService);

    if (configService.get<string>('APP_PROFILE') !== 'local') {
        const userName = configService.get<string>('SWAGGER_USER')!;
        const userPassword = configService.get<string>('SWAGGER_PASSWORD')!;
        app.use(
            [`/${SWAGGER_PATH}`, `/${SWAGGER_JSON_PATH}`],
            expressBasicAuth({
                challenge: true,
                users: {
                    [userName]: userPassword,
                },
            })
        );
    }

    const config = new DocumentBuilder()
        .setTitle(configService.get<string>('SWAGGER_TITLE') || 'Folioo API docs')
        .setDescription(
            configService.get<string>('SWAGGER_DESCRIPTION') || 'API document of Folioo Development'
        )
        .setVersion(configService.get<string>('SWAGGER_VERSION') || '1.0.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: '로그인 후 받은 accessToken을 입력하세요.',
            },
            'access-token'
        )
        .addSecurityRequirements('access-token')
        .build();

    await SwaggerModule.loadPluginMetadata(metadata);
    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup(SWAGGER_PATH, app, document, {
        jsonDocumentUrl: SWAGGER_JSON_PATH,
        swaggerOptions: {
            persistAuthorization: true,
        },
    });
}
