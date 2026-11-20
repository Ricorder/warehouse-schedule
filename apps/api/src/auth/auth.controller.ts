import { Ctx, Input, Mutation, Query, Router } from 'nestjs-trpc-v2';
import { requireUser } from '../common/auth.util';
import { toTRPCError } from '../common/trpc-error.util';
import type { TRPCContextShape } from '../configs/trpc/context.interface';
import {
	type LoginInput,
	loginInput,
	type ProfileOutput,
	profileOutput,
	type RegisterInput,
	registerInput,
	type SessionOutput,
	sessionOutput,
} from './dto/auth.zod';
import { AuthService } from './auth.service';

@Router({ alias: 'auth' })
export class AuthRouter {
	constructor(private readonly authService: AuthService) {}

	@Query({ output: profileOutput })
	async getMe(@Ctx() ctx: TRPCContextShape): Promise<ProfileOutput> {
		const user = requireUser(ctx);
		try {
			return await this.authService.findById(user.id);
		} catch (error) {
			throw toTRPCError(error, 'Не удалось загрузить профиль');
		}
	}

	@Mutation({ input: registerInput, output: sessionOutput })
	async signUp(@Input() input: RegisterInput): Promise<SessionOutput> {
		try {
			return await this.authService.register(input);
		} catch (error) {
			throw toTRPCError(error, 'Не удалось зарегистрироваться');
		}
	}

	@Mutation({ input: loginInput, output: sessionOutput })
	async signIn(@Input() input: LoginInput): Promise<SessionOutput> {
		try {
			return await this.authService.login(input);
		} catch (error) {
			throw toTRPCError(error, 'Не удалось войти');
		}
	}
}
