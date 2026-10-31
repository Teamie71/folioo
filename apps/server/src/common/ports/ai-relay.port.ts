export interface AiRelayRequest {
    path: string;
    body: unknown;
    headers?: Record<string, string>;
    timeoutMs?: number;
    returnHttpErrors?: boolean;
}

export interface AiRelayGetRequest {
    path: string;
    query?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string, string>;
    timeoutMs?: number;
    returnHttpErrors?: boolean;
}

export interface AiRelayJsonResponse<T = unknown> {
    data: T;
    status: number;
    headers: Record<string, string>;
}

export abstract class AiRelayPort {
    abstract getJson<T = unknown>(request: AiRelayGetRequest): Promise<AiRelayJsonResponse<T>>;
    abstract postJson<T = unknown>(request: AiRelayRequest): Promise<AiRelayJsonResponse<T>>;
}
