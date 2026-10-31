import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createTypeOrmOptions(): TypeOrmModuleOptions {
        const profile = this.configService.get<string>('APP_PROFILE', 'local');
        const isProd = profile === 'prod';
        const supabaseOptions = this.resolveSupabaseOptions(profile);

        return {
            type: 'postgres',
            host: supabaseOptions?.host ?? this.configService.get<string>('DB_HOST'),
            port:
                supabaseOptions?.port ?? Number(this.configService.get<string>('DB_PORT') ?? 5432),
            username: supabaseOptions?.username ?? this.configService.get<string>('DB_USERNAME'),
            password: supabaseOptions?.password ?? this.configService.get<string>('DB_PASSWORD'),
            database: supabaseOptions?.database ?? this.configService.get<string>('DB_SCHEMA'),
            autoLoadEntities: true,
            synchronize: false,
            logging: !isProd ? ['error', 'query'] : false,
            namingStrategy: new SnakeNamingStrategy(),
        };
    }

    private resolveSupabaseOptions(
        profile: string
    ): { host: string; port: number; username: string; password: string; database: string } | null {
        if (profile === 'local') {
            return null;
        }

        const supabaseDbUrl = this.configService.get<string>('SUPABASE_DB_URL');
        if (!supabaseDbUrl) {
            return null;
        }

        try {
            const parsed = new URL(supabaseDbUrl);
            const databasePath = parsed.pathname.replace(/^\//, '');

            if (!databasePath) {
                return null;
            }

            return {
                host: parsed.hostname,
                port: Number(parsed.port || 5432),
                username: decodeURIComponent(parsed.username),
                password: decodeURIComponent(parsed.password),
                database: databasePath,
            };
        } catch {
            return null;
        }
    }
}
