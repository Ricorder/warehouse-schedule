import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter({ routerOptions: { maxParamLength: 5000 } }),
	);

	const configService = app.get(ConfigService);
	const clientOrigin = configService.get<string>('CLIENT', 'http://localhost:3000');
	const port = Number(configService.get<string>('API_PORT', '8000'));

	app.enableCors({
		origin: clientOrigin.split(',').map((origin) => origin.trim()),
		methods: ['GET', 'POST', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	});

	await app.listen(port, '0.0.0.0');
	new Logger('Bootstrap').log(`API слушает http://localhost:${port} (tRPC: /trpc)`);
}

void bootstrap();
