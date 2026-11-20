import { z } from 'zod';

export const registerInput = z.object({
	name: z.string().min(3, 'Укажите имя и фамилию').max(255),
	email: z.email(),
	password: z.string().min(8, 'Минимум 8 символов').max(100),
	/**
	 * Роль указывается при регистрации, чтобы проверяющий мог завести
	 * и администратора, и сборщика без доступа к БД.
	 */
	role: z.enum(['admin', 'worker']),
});

export const loginInput = z.object({
	email: z.email(),
	password: z.string().min(1, 'Введите пароль'),
});

export const profileOutput = z.object({
	id: z.uuid(),
	name: z.string(),
	email: z.email(),
	role: z.enum(['admin', 'worker']),
});

export const sessionOutput = z.object({
	user: z.object({
		id: z.uuid(),
		name: z.string(),
		email: z.email(),
		role: z.enum(['admin', 'worker']),
	}),
	accessToken: z.string(),
	expiresIn: z.number(),
});

export type RegisterInput = z.infer<typeof registerInput>;
export type LoginInput = z.infer<typeof loginInput>;
export type ProfileOutput = z.infer<typeof profileOutput>;
export type SessionOutput = z.infer<typeof sessionOutput>;
