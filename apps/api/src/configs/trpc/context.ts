import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { type ContextOptions, TRPCContext } from 'nestjs-trpc-v2';
import type { AuthUser } from './context.interface';

@Injectable()
export class AppContext implements TRPCContext {
	private readonly logger = new Logger(AppContext.name);

	constructor(
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
	) {}

	async create({ req, res }: ContextOptions): Promise<Record<string, unknown>> {
		const authHeader = req.headers.authorization;
		return { req, res, user: await this.resolveUser(typeof authHeader === 'string' ? authHeader : undefined) };
	}

	private async resolveUser(authHeader?: string): Promise<AuthUser | null> {
		if (!authHeader?.startsWith('Bearer ')) return null;
		const token = authHeader.slice('Bearer '.length).trim();
		if (!token) return null;
		try {
			const payload = await this.jwtService.verifyAsync<{
				sub: string;
				name: string;
				role: AuthUser['role'];
			}>(token, { secret: this.configService.getOrThrow<string>('JWT_SECRET') });
			return { id: payload.sub, name: payload.name, role: payload.role };
		} catch {
			// Просроченный или подделанный токен — запрос считается анонимным.
			this.logger.debug('Отклонён невалидный access token');
			return null;
		}
	}
}
