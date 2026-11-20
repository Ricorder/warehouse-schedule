import { TRPCError } from '@trpc/server';
import type { AuthUser, TRPCContextShape } from '../configs/trpc/context.interface';

/** Требует авторизованного пользователя, иначе UNAUTHORIZED. */
export function requireUser(ctx: TRPCContextShape): AuthUser {
	if (!ctx?.user) {
		throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Требуется авторизация' });
	}
	return ctx.user;
}

/** Требует роль администратора, иначе FORBIDDEN. */
export function requireAdmin(ctx: TRPCContextShape): AuthUser {
	const user = requireUser(ctx);
	if (user.role !== 'admin') {
		throw new TRPCError({ code: 'FORBIDDEN', message: 'Действие доступно только администратору' });
	}
	return user;
}
