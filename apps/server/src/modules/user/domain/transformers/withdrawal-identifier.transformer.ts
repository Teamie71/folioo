import { createHash, createHmac } from 'crypto';

const TOKEN_ENCRYPTION_ENV = 'WITHDRAWN_IDENTIFIER_ENCRYPTION_KEY';

function isStrictProfile(): boolean {
    const profile = (process.env.APP_PROFILE ?? 'local').toLowerCase();
    return profile === 'dev' || profile === 'prod';
}

export function resolveEncryptionKey(): Buffer | null {
    const rawKey = process.env[TOKEN_ENCRYPTION_ENV];
    if (!rawKey || rawKey.trim().length === 0) {
        if (isStrictProfile()) {
            throw new Error(
                `${TOKEN_ENCRYPTION_ENV} must be configured when APP_PROFILE is dev/prod.`
            );
        }

        return null;
    }

    return createHash('sha256').update(rawKey, 'utf8').digest();
}

/**
 * 탈퇴 회원 식별자 해싱 (재가입 방지 검증용)
 * 동일한 identifier를 넣으면 항상 동일한 해시값이 반환되므로 DB 검색(WHERE 절)에 사용할 수 있습니다.
 */
export function hashWithdrawalIdentifier(identifier: string): string {
    const encryptionKey = resolveEncryptionKey();

    if (!encryptionKey) {
        return `raw:${identifier}`;
    }

    // HMAC-SHA256을 사용해 단방향 해싱
    const hashed = createHmac('sha256', encryptionKey)
        .update(identifier, 'utf8')
        .digest('base64url');

    return `hash.v1:${hashed}`;
}
