import { Module } from '@nestjs/common';
import { TRPCModule } from 'nestjs-trpc-v2';
import superjson from 'superjson';
import { AppContext } from './context';
import { LoggerMiddleware } from './logger.middleware';

@Module({
	imports: [
		TRPCModule.forRoot({
			// Схема роутера генерируется прямо во фронтенд — типы клиента
			// всегда соответствуют серверу без ручной синхронизации.
			autoSchemaFile: './../web/src/shared/api/trpc/@generated',
			context: AppContext,
			transformer: {
				runtime: superjson,
				importName: 'superjson',
				importPath: 'superjson',
			},
		}),
	],
	providers: [AppContext, LoggerMiddleware],
})
export class TrpcModule {}
