jest.mock('@sentry/nestjs', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() },
}));
import * as Sentry from '@sentry/nestjs';
import { ConsoleLogger, Logger } from '@nestjs/common';
import { SentryLogger } from './sentry.logger';

describe('SentryLogger', () => {
    let sentryLogger: SentryLogger;

    beforeEach(() => {
        jest.clearAllMocks();
        // 콘솔 출력은 테스트에서 조용히 한다. Sentry 전달만 확인한다.
        for (const method of ['log', 'warn', 'error', 'fatal', 'debug', 'verbose'] as const) {
            jest.spyOn(ConsoleLogger.prototype, method).mockImplementation(() => undefined);
        }
        sentryLogger = new SentryLogger();
        Logger.overrideLogger(sentryLogger);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        Logger.overrideLogger(new ConsoleLogger());
    });

    it('Nest Logger 레벨을 Sentry Logs 레벨로 보내고 context를 속성으로 붙인다', () => {
        const logger = new Logger('KakaoSkillFacade');

        logger.log('started');
        logger.warn('slow');
        logger.error('failed');
        logger.fatal('down');

        expect(Sentry.logger.info).toHaveBeenCalledWith('started', { context: 'KakaoSkillFacade' });
        expect(Sentry.logger.warn).toHaveBeenCalledWith('slow', { context: 'KakaoSkillFacade' });
        expect(Sentry.logger.error).toHaveBeenCalledWith('failed', { context: 'KakaoSkillFacade' });
        expect(Sentry.logger.fatal).toHaveBeenCalledWith('down', { context: 'KakaoSkillFacade' });
    });

    it('debug·verbose는 보내지 않는다', () => {
        const logger = new Logger('Any');

        logger.debug('noise');
        logger.verbose('noise');

        expect(
            Object.values(Sentry.logger).every((fn) => !(fn as jest.Mock).mock.calls.length)
        ).toBe(true);
    });

    it('객체 인자의 문자열·숫자·불리언 값을 속성으로 넣고, 민감한 키와 중첩 값은 뺀다', () => {
        const logger = new Logger('KakaoSkillFacade');

        logger.warn('Kakao expired turn requires outcome verification', {
            userId: 3,
            requestId: 'r1',
            retried: true,
            accessToken: 'secret-token',
            apiKey: 'secret-key',
            nested: { callbackUrl: 'https://bot-api.kakao.com/v1/callbacks/token' },
        });

        expect(Sentry.logger.warn).toHaveBeenCalledWith(
            'Kakao expired turn requires outcome verification',
            { context: 'KakaoSkillFacade', userId: 3, requestId: 'r1', retried: true }
        );
    });

    it('error의 stack 인자는 보내지 않는다 (스택은 Sentry Issues에서 본다)', () => {
        const logger = new Logger('GlobalExceptionFilter');

        logger.error('🚨 [Unexpected Error] /blocks', 'Error: boom\n    at handler (a.ts:1:1)');

        expect(Sentry.logger.error).toHaveBeenCalledWith('🚨 [Unexpected Error] /blocks', {
            context: 'GlobalExceptionFilter',
        });
    });

    it('긴 메시지(AI 응답 본문 등)는 잘라서 보낸다', () => {
        const logger = new Logger('HttpAiPdfExtractAdapter');

        logger.error(`Unexpected AI extract response shape: ${'x'.repeat(5000)}`);

        const [message] = (Sentry.logger.error as jest.Mock).mock.calls[0] as [string];
        expect(message.length).toBeLessThan(1100);
        expect(message.endsWith('…(truncated)')).toBe(true);
    });

    it('객체를 메시지로 넘겨도 민감한 키는 빼고 보낸다 (중첩 포함)', () => {
        new Logger('Any').warn({
            event: 'refresh',
            accessToken: 'secret-token',
            nested: { password: 'pw', userId: 3 },
        });

        const [message] = (Sentry.logger.warn as jest.Mock).mock.calls[0] as [string];
        expect(JSON.parse(message)).toEqual({ event: 'refresh', nested: { userId: 3 } });
    });

    it('Nest 부트스트랩 로그(InstanceLoader 등)는 보내지 않는다', () => {
        new Logger('InstanceLoader').log('AppModule dependencies initialized');
        new Logger('RouterExplorer').log('Mapped {/health, GET} route');

        expect(Sentry.logger.info).not.toHaveBeenCalled();
    });

    it('콘솔 출력은 그대로 유지한다', () => {
        const consoleError = jest
            .spyOn(ConsoleLogger.prototype, 'error')
            .mockImplementation(() => undefined);

        new Logger('KakaoSkillFacade').error('failed');

        // Nest Logger가 넘긴 인자를 바꾸지 않고 콘솔로 그대로 전달한다.
        expect(consoleError).toHaveBeenCalledWith('failed', undefined, 'KakaoSkillFacade');
    });
});
