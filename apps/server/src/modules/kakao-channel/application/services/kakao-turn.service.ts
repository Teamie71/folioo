import { Injectable } from '@nestjs/common';
import { AiRelayPort } from 'src/common/ports/ai-relay.port';
import { KAKAO_DELIVERY_STATUSES } from '../dtos/kakao-turn.dto';
import type { KakaoTurnRequest, KakaoTurnStatus } from '../dtos/kakao-turn.dto';

@Injectable()
export class KakaoTurnService {
    constructor(private readonly aiRelayPort: AiRelayPort) {}

    isValidCallbackUrl(value: unknown): value is string {
        if (typeof value !== 'string' || value.length > 4096 || value.trim() !== value)
            return false;
        try {
            const url = new URL(value);
            return (
                url.protocol === 'https:' &&
                url.hostname === 'bot-api.kakao.com' &&
                (!url.port || url.port === '443') &&
                !url.username &&
                !url.password &&
                !url.hash &&
                url.pathname.startsWith('/v1/')
            );
        } catch {
            return false;
        }
    }

    async accept(
        sessionId: string,
        body: KakaoTurnRequest,
        timeoutMs: number
    ): Promise<'ACCEPTED' | 'REJECTED' | 'UNKNOWN'> {
        try {
            const response = await this.aiRelayPort.postJson({
                path: `/sessions/${encodeURIComponent(sessionId)}/kakao/turns`,
                body,
                timeoutMs,
                returnHttpErrors: true,
            });
            if (response.status === 202) return 'ACCEPTED';
            if ([400, 401, 403, 404, 422].includes(response.status)) return 'REJECTED';
        } catch {
            // HTTP timeout과 연결 종료만으로 접수 실패를 판정하지 않는다. 원문에는 콜백 토큰이 있다.
        }
        return 'UNKNOWN';
    }

    async getStatus(
        userId: number,
        requestId: string,
        timeoutMs = 1000
    ): Promise<KakaoTurnStatus | null> {
        try {
            const { status, data } = await this.aiRelayPort.getJson<unknown>({
                path: `/kakao/turns/${encodeURIComponent(requestId)}`,
                query: { user_id: String(userId) },
                timeoutMs,
                returnHttpErrors: true,
            });
            if (status !== 200 || !data || typeof data !== 'object') return null;
            const row = data as Record<string, unknown>;
            if (
                row.request_id !== requestId ||
                ![
                    'ACCEPTED',
                    'RUNNING',
                    'SUCCEEDED',
                    'FAILED',
                    'EXPIRED',
                    'COMMIT_UNKNOWN',
                ].includes(String(row.state)) ||
                !KAKAO_DELIVERY_STATUSES.includes(
                    row.delivery_status as KakaoTurnStatus['delivery_status']
                )
            )
                return null;
            return row as unknown as KakaoTurnStatus;
        } catch {
            return null;
        }
    }
}
