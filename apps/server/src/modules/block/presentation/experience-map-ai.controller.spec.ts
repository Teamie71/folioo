import type { INestApplication } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';
import { ExperienceMapTicketFacade } from '../application/facades/experience-map-ticket.facade';
import { ExperienceMapFacade } from '../application/facades/experience-map.facade';
import { AiAgentUsageService } from '../application/services/ai-agent-usage.service';
import { AiExperienceSessionService } from '../application/services/ai-experience-session.service';
import { ExperienceMapAiController } from './experience-map-ai.controller';

describe('ExperienceMapAiController activity seen HTTP contract', () => {
    let app: INestApplication;
    const sessions = { markSeen: jest.fn().mockResolvedValue(undefined) };

    beforeAll(async () => {
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const module = await Test.createTestingModule({
            controllers: [ExperienceMapAiController],
            providers: [
                { provide: ExperienceMapTicketFacade, useValue: {} },
                { provide: ExperienceMapFacade, useValue: {} },
                { provide: AiAgentUsageService, useValue: {} },
                { provide: AiExperienceSessionService, useValue: sessions },
            ],
        }).compile();
        app = module.createNestApplication();
        app.use((req: { user?: { sub: number } }, _res: unknown, next: () => void) => {
            req.user = { sub: 1 };
            next();
        });
        app.useGlobalFilters(new GlobalExceptionFilter(app.get(HttpAdapterHost)));
        await app.init();
    });

    beforeEach(() => jest.clearAllMocks());

    afterAll(async () => {
        await app.close();
        jest.restoreAllMocks();
    });

    it.each([
        'e_mvv2yxjo_1',
        'abc',
        '1.5',
        '1e3',
        '-1',
        '0',
        '9223372036854775808',
        '999999999999999999999999999999',
    ])('잘못된 ID %s는 서비스 호출 없이 COMMON400으로 거절한다', async (blockId) => {
        const response = await request(app.getHttpServer() as App)
            .post(`/api/v1/experience-map/activity-status/${blockId}/seen`)
            .expect(400);

        expect((response.body as { error: { errorCode: string } }).error.errorCode).toBe(
            'COMMON400'
        );
        expect(sessions.markSeen).not.toHaveBeenCalled();
    });

    it.each(['1', '9007199254740993', '9223372036854775807'])(
        '유효한 bigint ID %s는 정밀도 손실 없이 문자열로 전달한다',
        async (blockId) => {
            await request(app.getHttpServer() as App)
                .post(`/api/v1/experience-map/activity-status/${blockId}/seen`)
                .expect(201);

            expect(sessions.markSeen).toHaveBeenCalledWith(1, blockId);
        }
    );
});
