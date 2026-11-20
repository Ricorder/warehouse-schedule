import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { eq } from 'drizzle-orm';
import type { DrizzleDB } from '../configs/db/drizzle';
import { DrizzleAsyncProvider } from '../configs/db/drizzle.provider';
import { employees } from '../configs/db/schema';
import type { LoginInput, ProfileOutput, RegisterInput, SessionOutput } from './dto/auth.zod';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
	constructor(
		@Inject(DrizzleAsyncProvider) private readonly db: DrizzleDB,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
	) {}

	async findById(id: string): Promise<ProfileOutput> {
		const [user] = await this.db
			.select({
				id: employees.id,
				name: employees.name,
				email: employees.email,
				role: employees.role,
			})
			.from(employees)
			.where(eq(employees.id, id))
			.limit(1);
		if (!user) {
			throw new NotFoundException('Пользователь не найден');
		}
		return user;
	}

	async register(input: RegisterInput): Promise<SessionOutput> {
		const email = input.email.trim().toLowerCase();
		const [existing] = await this.db.select({ id: employees.id }).from(employees).where(eq(employees.email, email));
		if (existing) {
			throw new ConflictException('Пользователь с таким email уже существует');
		}

		const [user] = await this.db
			.insert(employees)
			.values({
				name: input.name.trim(),
				email,
				password: await hash(input.password, BCRYPT_ROUNDS),
				role: input.role,
			})
			.returning({
				id: employees.id,
				name: employees.name,
				email: employees.email,
				role: employees.role,
			});

		return this.issueSession(user);
	}

	async login(input: LoginInput): Promise<SessionOutput> {
		const email = input.email.trim().toLowerCase();
		const [user] = await this.db.select().from(employees).where(eq(employees.email, email)).limit(1);
		// Сравниваем пароль даже при отсутствии пользователя — иначе по времени
		// ответа можно перебирать существующие email.
		const passwordHash = user?.password ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';
		const passwordMatches = await compare(input.password, passwordHash);
		if (!user || !passwordMatches) {
			throw new UnauthorizedException('Неверный email или пароль');
		}

		return this.issueSession({ id: user.id, name: user.name, email: user.email, role: user.role });
	}

	private async issueSession(user: ProfileOutput): Promise<SessionOutput> {
		const accessToken = await this.jwtService.signAsync(
			{ sub: user.id, name: user.name, role: user.role },
			{
				expiresIn: '1d',
				secret: this.configService.getOrThrow<string>('JWT_SECRET'),
			},
		);
		return { user, accessToken, expiresIn: Date.now() + ACCESS_TOKEN_TTL_MS };
	}
}
