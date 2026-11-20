import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthRouter } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
	imports: [
		JwtModule.registerAsync({
			global: true,
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.getOrThrow<string>('JWT_SECRET'),
				signOptions: { expiresIn: '1d' },
			}),
		}),
	],
	providers: [AuthRouter, AuthService],
	exports: [AuthService],
})
export class AuthModule {}
