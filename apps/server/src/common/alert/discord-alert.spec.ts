import type { ErrorEvent } from '@sentry/nestjs';
import { Logger } from '@nestjs/common';
import {
    buildDiscordMessage,
    createDiscordAlert,
    DISCORD_ALERT_THROTTLE_MS,
    DISCORD_DESCRIPTION_LIMIT,
    type DiscordMessage,
} from './discord-alert';

const serverError = (overrides: Partial<ErrorEvent> = {}): ErrorEvent => ({
    type: undefined,
    event_id: 'evt1',
    level: 'error',
    environment: 'prod',
    timestamp: 1_700_000_000,
    exception: { values: [{ type: 'QueryFailedError', value: 'connection refused' }] },
    request: { method: 'GET', url: 'https://api.folioo.ai/api/v1/blocks?page=1' },
    user: { id: '3' },
    ...overrides,
});

const kakaoEvent = (
    source: string | undefined,
    overrides: Partial<ErrorEvent> = {}
): ErrorEvent => ({
    type: undefined,
    event_id: 'evt2',
    level: 'error',
    environment: 'prod',
    message: 'Kakao AI relay failed',
    tags: { component: 'kakao', ...(source ? { source } : {}), 'kakao.stage': 'submit' },
    user: { id: '4' },
    extra: { request_id: 'r1' },
    ...overrides,
});

const embedOf = (message: DiscordMessage) => message.embeds[0];

describe('discord-alert', () => {
    describe('buildDiscordMessage', () => {
        it('일반 5xx는 종류, 위치(쿼리 제외), 대상, 에러 본문, Sentry 링크, 환경을 담는다', () => {
            const embed = embedOf(
                buildDiscordMessage(serverError({ release: 'folioo-server@0.0.1' }), 'folioo')
            );

            expect(embed.title).toBe('🔴 서버 5xx 에러');
            expect(embed.url).toBe('https://folioo.sentry.io/issues/?query=evt1');
            expect(embed.description).toBe(
                [
                    '**위치**\u3000`GET /api/v1/blocks`',
                    '**대상**\u3000사용자 `3`',
                    '',
                    '```\nQueryFailedError: connection refused\n```',
                    '',
                    '🔗 [Sentry에서 자세히 보기](https://folioo.sentry.io/issues/?query=evt1)',
                ].join('\n')
            );
            expect(embed.footer.text).toBe(
                'prod · folioo-server@0.0.1 · 같은 에러는 5분간 다시 알리지 않음'
            );
        });

        it.each([
            [undefined, '🟠 카카오 ① 우리 서버 실패'],
            ['ai-relay', '🟡 카카오 ② AI 서버 호출 실패'],
            ['ai-internal', '🟣 카카오 ③ AI 서버 내부 실패'],
        ])('카카오 source=%s는 "%s"로 표시한다', (source, title) => {
            expect(embedOf(buildDiscordMessage(kakaoEvent(source))).title).toBe(title);
        });

        it('카카오 ②는 단계(한글), 결과, 사용자와 request_id를 보여주고 에러 본문은 넣지 않는다', () => {
            const embed = embedOf(
                buildDiscordMessage(
                    kakaoEvent('ai-relay', {
                        tags: {
                            component: 'kakao',
                            source: 'ai-relay',
                            'kakao.stage': 'submit',
                            'kakao.result': 'REJECTED',
                        },
                    })
                )
            );

            expect(embed.description).toContain('**단계**\u3000AI 턴 접수 (`submit`)');
            expect(embed.description).toContain('**결과**\u3000`REJECTED`');
            expect(embed.description).toContain('**대상**\u3000사용자 `4` · request_id `r1`');
            expect(embed.description).not.toContain('```');
        });

        it.each([
            [undefined, '🟠 첨삭 ① 우리 서버 실패'],
            ['ai-relay', '🟡 첨삭 ② AI 서버 호출 실패'],
            ['ai-internal', '🟣 첨삭 ③ AI 서버 내부 실패'],
        ])('첨삭 source=%s는 "%s"로 표시하고 단계와 첨삭 ID를 담는다', (source, title) => {
            const embed = embedOf(
                buildDiscordMessage(
                    kakaoEvent(source, {
                        message: 'Correction AI relay failed',
                        tags: {
                            component: 'correction',
                            ...(source ? { source } : {}),
                            'correction.stage': 'rag',
                        },
                        extra: { correction_id: 10 },
                    })
                )
            );

            expect(embed.title).toBe(title);
            expect(embed.description).toContain('**단계**\u3000기업 분석 (`rag`)');
            expect(embed.description).toContain('**대상**\u3000사용자 `4` · 첨삭 `10`');
        });

        it('조직을 모르면 링크 대신 event_id를 넣고, 사용자가 없으면 로그인 전 요청으로 표시하고, 멘션은 막는다', () => {
            const message = buildDiscordMessage(serverError({ user: undefined }));

            expect(embedOf(message).url).toBeUndefined();
            expect(embedOf(message).description).toContain('Sentry event_id `evt1`');
            expect(embedOf(message).description).toContain('**대상**\u3000로그인 전 요청');
            expect(message.allowed_mentions).toEqual({ parse: [] });
        });

        it('아주 긴 경로가 와도 설명이 Discord 제한(4096자)을 넘지 않는다', () => {
            const { description } = embedOf(
                buildDiscordMessage(
                    serverError({
                        request: {
                            method: 'GET',
                            url: `https://api.folioo.ai/${'a'.repeat(10_000)}`,
                        },
                    })
                )
            );

            expect(description.length).toBeLessThanOrEqual(DISCORD_DESCRIPTION_LIMIT);
            expect(description).toContain('Sentry event_id');
        });

        it('긴 에러 메시지는 자르고, 메시지 속 코드 블록 기호는 무력화한다', () => {
            const { description } = embedOf(
                buildDiscordMessage(
                    serverError({
                        exception: { values: [{ type: 'Error', value: '```' + 'x'.repeat(5000) }] },
                    })
                )
            );

            expect(description.length).toBeLessThan(500);
            expect(description.match(/```/g)).toHaveLength(2);
        });
    });

    describe('createDiscordAlert', () => {
        let now: number;
        let fetchFn: jest.Mock;
        let alert: (event: ErrorEvent) => void;

        beforeEach(() => {
            now = 0;
            fetchFn = jest.fn().mockResolvedValue({ ok: true, status: 204 });
            alert = createDiscordAlert({
                webhookUrl: 'https://discord.test/webhook',
                fetchFn: fetchFn as unknown as typeof fetch,
                now: () => now,
            });
        });

        it('Webhook으로 JSON을 POST한다', () => {
            alert(serverError());

            expect(fetchFn).toHaveBeenCalledWith(
                'https://discord.test/webhook',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        });

        it('같은 에러는 사용자가 달라도 5분에 한 번만 보낸다', () => {
            alert(serverError({ user: { id: '1' } }));
            now += 60_000;
            alert(serverError({ user: { id: '2' } }));
            expect(fetchFn).toHaveBeenCalledTimes(1);

            now += DISCORD_ALERT_THROTTLE_MS;
            alert(serverError());
            expect(fetchFn).toHaveBeenCalledTimes(2);
        });

        it('다른 에러, 다른 경로, 카카오 종류는 따로 보낸다', () => {
            alert(serverError());
            alert(
                serverError({
                    request: { method: 'GET', url: 'https://api.folioo.ai/api/v1/users' },
                })
            );
            alert(
                kakaoEvent('ai-relay', { fingerprint: ['kakao', 'ai-relay', 'submit', 'ERROR'] })
            );
            alert(kakaoEvent('ai-internal', { fingerprint: ['kakao', 'ai-internal', 'FAIL'] }));

            expect(fetchFn).toHaveBeenCalledTimes(4);
        });

        it('error·fatal이 아닌 이벤트는 보내지 않는다', () => {
            alert(serverError({ level: 'warning' }));

            expect(fetchFn).not.toHaveBeenCalled();
        });

        it('전송이 실패해도 예외를 던지지 않고 warn만 남긴다', async () => {
            const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
            fetchFn.mockRejectedValueOnce(new Error('timeout'));

            expect(() => alert(serverError())).not.toThrow();
            await new Promise((resolve) => setImmediate(resolve));

            expect(warn).toHaveBeenCalledWith('Discord alert failed: timeout');
            warn.mockRestore();
        });
    });
});
