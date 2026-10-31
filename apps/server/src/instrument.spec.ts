jest.mock('@sentry/nestjs', () => ({
    init: jest.fn(),
    httpIntegration: jest.fn((options: unknown) => options),
}));
import * as Sentry from '@sentry/nestjs';
import './instrument';

describe('Kakao callback privacy', () => {
    const options = ((Sentry.init as jest.Mock).mock.calls as unknown[][])[0][0] as {
        beforeSend: (event: unknown) => unknown;
        beforeSendTransaction: (event: unknown) => unknown;
        integrations: {
            ignoreIncomingRequests: (url: string) => boolean;
            ignoreOutgoingRequests: (url: string) => boolean;
        }[];
    };

    it('스킬 요청의 오류·트레이스 이벤트는 토큰이 담긴 본문과 함께 전송하지 않는다', () => {
        const event = {
            request: {
                url: 'https://api.test/kakao/skill/chat',
                data: { callbackUrl: 'secret-token' },
            },
        };
        expect(options.beforeSend(event)).toBeNull();
        expect(options.beforeSendTransaction(event)).toBeNull();
        expect(options.integrations[0].ignoreIncomingRequests('/kakao/skill/chat')).toBe(true);
        expect(
            options.integrations[0].ignoreOutgoingRequests(
                'https://ai.test/sessions/sid/kakao/turns'
            )
        ).toBe(true);
    });

    it('카카오 턴 이외의 오류 보고는 유지한다', () => {
        const event = { request: { url: 'https://api.test/blocks' } };
        expect(options.beforeSend(event)).toBe(event);
        expect(options.beforeSendTransaction(event)).toBe(event);
    });
});
