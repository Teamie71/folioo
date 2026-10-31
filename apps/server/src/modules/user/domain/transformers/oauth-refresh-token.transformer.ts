import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { ValueTransformer } from 'typeorm';

const ENCRYPTED_PREFIX = 'enc.v1';
const TOKEN_ENCRYPTION_ENV = 'OAUTH_REFRESH_TOKEN_ENCRYPTION_KEY';
const TOKEN_CIPHER_ALGORITHM = 'aes-256-gcm';
const TOKEN_IV_LENGTH = 12;

function isStrictProfile(): boolean {
    const profile = (process.env.APP_PROFILE ?? 'local').toLowerCase();
    return profile === 'dev' || profile === 'prod';
}

function resolveEncryptionKey(): Buffer | null {
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

function isEncrypted(value: string): boolean {
    return value.startsWith(`${ENCRYPTED_PREFIX}:`);
}

function encryptToken(value: string): string {
    if (isEncrypted(value)) {
        return value;
    }

    const encryptionKey = resolveEncryptionKey();
    if (!encryptionKey) {
        return value;
    }

    const iv = randomBytes(TOKEN_IV_LENGTH);
    const cipher = createCipheriv(TOKEN_CIPHER_ALGORITHM, encryptionKey, iv);
    const encryptedBuffer = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${ENCRYPTED_PREFIX}:${iv.toString('base64url')}:${authTag.toString('base64url')}:${encryptedBuffer.toString('base64url')}`;
}

function decryptToken(value: string): string {
    if (!isEncrypted(value)) {
        return value;
    }

    const encryptionKey = resolveEncryptionKey();
    if (!encryptionKey) {
        throw new Error(
            `${TOKEN_ENCRYPTION_ENV} must be configured to decrypt encrypted OAuth refresh tokens.`
        );
    }

    const parts = value.split(':');
    if (parts.length !== 4) {
        throw new Error('Invalid encrypted oauth refresh token format.');
    }

    const iv = Buffer.from(parts[1], 'base64url');
    const authTag = Buffer.from(parts[2], 'base64url');
    const encrypted = Buffer.from(parts[3], 'base64url');

    const decipher = createDecipheriv(TOKEN_CIPHER_ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decryptedBuffer = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decryptedBuffer.toString('utf8');
}

export const oauthRefreshTokenTransformer: ValueTransformer = {
    to(value: string | null): string | null {
        if (!value) {
            return null;
        }

        return encryptToken(value);
    },
    from(value: string | null): string | null {
        if (!value) {
            return null;
        }

        return decryptToken(value);
    },
};
