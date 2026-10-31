import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AuthToken, AuthTokenType } from '../src/modules/auth/domain/entities/auth-token.entity';
import { AuthTokenRepository } from '../src/modules/auth/infrastructure/repositories/auth-token.repository';
import { AuthTokenStoreService } from '../src/modules/auth/infrastructure/services/auth-token-store.service';

const databaseUrl = process.env.AUTH_TOKEN_TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('Auth token PostgreSQL contract', () => {
    let db: DataSource;
    let store: AuthTokenStoreService;
    const jwt = new JwtService({ secret: 'auth-token-db-test' });

    beforeAll(async () => {
        const url = new URL(databaseUrl!);
        if (
            !['localhost', '127.0.0.1'].includes(url.hostname) ||
            url.pathname !== '/auth_token_test'
        ) {
            throw new Error('Only an isolated local auth_token_test database is allowed');
        }
        db = new DataSource({
            type: 'postgres',
            url: databaseUrl,
            entities: [AuthToken],
            namingStrategy: new SnakeNamingStrategy(),
            synchronize: false,
        });
        await db.initialize();
        await db.query('CREATE TABLE users (id INT PRIMARY KEY)');
        await db.query(
            readFileSync(
                join(__dirname, '../supabase/migrations/20261030140000_create_auth_token.sql'),
                'utf8'
            )
        );
        await db.query('CREATE ROLE auth_token_test_client');
        await db.query('GRANT SELECT, INSERT ON auth_token TO auth_token_test_client');
        await db.query('GRANT USAGE ON SEQUENCE auth_token_id_seq TO auth_token_test_client');
        store = new AuthTokenStoreService(
            new AuthTokenRepository(db.getRepository(AuthToken)),
            new ConfigService({ JWT_REFRESH_EXPIRES_IN: '14d' }),
            jwt
        );
    });

    beforeEach(async () => {
        await db.query('TRUNCATE users, auth_token CASCADE');
        await db.query('INSERT INTO users (id) VALUES (1)');
    });

    afterAll(async () => {
        if (db?.isInitialized) {
            await db.query('DROP TABLE auth_token, users');
            await db.query('DROP TYPE auth_token_type_enum');
            await db.query('DROP ROLE auth_token_test_client');
            await db.destroy();
        }
    });

    it('persists and removes refresh tokens', async () => {
        await store.whitelistRefreshToken('refresh-token', 1);
        expect(await store.isRefreshTokenWhitelisted('refresh-token')).toBe(true);
        const saved = await db
            .getRepository(AuthToken)
            .findOneByOrFail({ type: AuthTokenType.REFRESH });
        expect(saved.token).toMatch(/^[a-f0-9]{64}$/);
        expect(saved.token).not.toBe('refresh-token');
        await store.removeRefreshToken('refresh-token');
        expect(await store.isRefreshTokenWhitelisted('refresh-token')).toBe(false);
    });

    it('excludes expired tokens from both whitelist and blacklist checks', async () => {
        const repository = db.getRepository(AuthToken);
        const digest = createHash('sha256').update('expired').digest('hex');
        await repository.save([
            AuthToken.create(AuthTokenType.REFRESH, digest, new Date(0), 1),
            AuthToken.create(AuthTokenType.ACCESS_BLACKLIST, digest, new Date(0)),
        ]);
        expect(await store.isRefreshTokenWhitelisted('expired')).toBe(false);
        expect(await store.isAccessTokenBlacklisted('expired')).toBe(false);
    });

    it('blacklists access tokens without treating them as refresh tokens', async () => {
        const token = jwt.sign({ sub: 1 }, { expiresIn: '1h' });
        await store.blacklistAccessToken(token);
        expect(await store.isAccessTokenBlacklisted(token)).toBe(true);
        expect(await store.isRefreshTokenWhitelisted(token)).toBe(false);
        const saved = await db
            .getRepository(AuthToken)
            .findOneByOrFail({ type: AuthTokenType.ACCESS_BLACKLIST });
        expect(saved.token).toMatch(/^[a-f0-9]{64}$/);
        expect(saved.token).not.toBe(token);
        expect(saved.userId).toBeNull();
        const tokenExpiry = jwt.decode<{ exp: number }>(token).exp * 1000;
        expect(saved.expiresAt.getTime()).toBeGreaterThanOrEqual(tokenExpiry);
        expect(saved.expiresAt.getTime()).toBeLessThan(tokenExpiry + 1000);
    });

    it('removes refresh tokens when their user is deleted', async () => {
        await store.whitelistRefreshToken('refresh-token', 1);
        await db.query('DELETE FROM users WHERE id = 1');
        expect(await store.isRefreshTokenWhitelisted('refresh-token')).toBe(false);
    });

    it('blocks public API roles from reading or inserting tokens despite table grants', async () => {
        await store.whitelistRefreshToken('private-refresh-token', 1);
        const connection = db.createQueryRunner();
        await connection.connect();
        try {
            await connection.query('SET ROLE auth_token_test_client');
            expect(await connection.query('SELECT token FROM auth_token')).toEqual([]);
            await expect(
                connection.query(
                    "INSERT INTO auth_token (type, token, expires_at) VALUES ('REFRESH', 'forged', '2099-01-01')"
                )
            ).rejects.toThrow(/row-level security/);
        } finally {
            await connection.query('RESET ROLE');
            await connection.release();
        }
    });
});
