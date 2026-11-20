import type { FastifyReply, FastifyRequest } from 'fastify';

export type UserRole = 'admin' | 'worker';

export interface AuthUser {
	id: string;
	name: string;
	role: UserRole;
}

export interface TRPCContextShape {
	req: FastifyRequest;
	res: FastifyReply;
	/** null — запрос без валидного токена. */
	user: AuthUser | null;
}
