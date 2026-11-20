'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { homeRouteFor, useAuth } from '@/features';
import { Button, ErrorMessage, Field, Input } from '@/shared';
import s from './auth.module.scss';

export function LoginPage() {
	const router = useRouter();
	const { login, isSubmitting } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		try {
			const user = await login(email, password);
			router.replace(homeRouteFor(user.role));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось войти');
		}
	};

	const fill = (demoEmail: string) => {
		setEmail(demoEmail);
		setPassword('password123');
	};

	return (
		<div className={s.wrapper}>
			<div className={s.card}>
				<h1 className={s.title}>Вход в систему</h1>
				<p className={s.subtitle}>Учёт рабочего времени сотрудников склада</p>

				<form className={s.form} onSubmit={handleSubmit}>
					<Field label="Email" htmlFor="email">
						<Input
							id="email"
							type="email"
							autoComplete="username"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							required
						/>
					</Field>

					<Field label="Пароль" htmlFor="password">
						<Input
							id="password"
							type="password"
							autoComplete="current-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							required
						/>
					</Field>

					{error && <ErrorMessage>{error}</ErrorMessage>}

					<Button type="submit" variant="primary" loading={isSubmitting}>
						Войти
					</Button>
				</form>

				<p className={s.footer}>
					Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
				</p>

				<div className={s.demo}>
					<div className={s.demoTitle}>Демо-доступы (пароль password123)</div>
					<div className={s.demoRow}>
						<span className={s.mono}>admin@warehouse.local</span>
						<button type="button" onClick={() => fill('admin@warehouse.local')}>
							админ
						</button>
					</div>
					<div className={s.demoRow}>
						<span className={s.mono}>klavdiya@warehouse.local</span>
						<button type="button" onClick={() => fill('klavdiya@warehouse.local')}>
							сотрудник
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
