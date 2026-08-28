import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Módulo de caché con fallback a memoria local.
 * En desarrollo local sin Redis, usa caché in-memory automáticamente.
 * En producción con Redis, usa caché distribuido.
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisCacheModule');
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD', '');
        const ttl = configService.get<number>('CACHE_TTL_SECONDS', 300);

        // Intentar conectar a Redis; si falla, usar caché en memoria
        try {
          const { redisStore } = await import('cache-manager-ioredis-yet');
          const store = await redisStore({
            host: redisHost,
            port: redisPort,
            password: redisPassword || undefined,
            db: 1,
            ttl: ttl * 1000,
            connectTimeout: 3000,
            maxRetriesPerRequest: 1,
          });
          logger.log(`Cache Redis conectado en ${redisHost}:${redisPort}`);
          return { store };
        } catch {
          logger.warn(`Redis no disponible (${redisHost}:${redisPort}). Usando cache en memoria.`);
          return { ttl: ttl * 1000 };
        }
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}

