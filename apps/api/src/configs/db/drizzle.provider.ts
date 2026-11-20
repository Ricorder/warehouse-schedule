import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DrizzleAsyncProvider = Symbol('DRIZZLE');

export const drizzleProvider = [
	{
		provide: DrizzleAsyncProvider,
		inject: [ConfigService],
		useFactory: async (configService: ConfigService) => {
			const pool = new Pool({
				connectionString: configService.getOrThrow<string>('DB_URL'),
				max: 10,
			});
			// Ранняя проверка соединения, чтобы приложение падало на старте,
			// а не на первом запросе.
			await pool.query('select 1');
			new Logger('Drizzle').log('Подключение к базе установлено');
			return drizzle(pool, { schema });
		},
	},
];
