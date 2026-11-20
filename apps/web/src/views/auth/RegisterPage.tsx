'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { homeRouteFor, useAuth } from '@/features';
import { Button, ErrorMessage, Field, Input, Select } from '@/shared';
import type { UserRole } from '@/shared';
import s from './auth.module.scss';

export function RegisterPage() {
	const router = useRouter();
	const { register, isSubmitting } = useAuth();
	const [form, setForm] = useState({ name: '', email: '', password: '', role: 'worker' as UserRole });
	const [error, setError] = useState<string | null>(null);

	const patch = (partial: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...partial }));

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		try {
			const user = await register(form);
			router.replace(homeRouteFor(user.role));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось зарегистрироваться');
		}
	};

	return (
		<div className={s.wrapper}>
			<div className={s.card}>
				<h1 className={s.title}>Регистрация</h1>
				<p className={s.subtitle}>Создайте учётную запись сотрудника склада</p>

				<form className={s.form} onSubmit={handleSubmit}>
					<Field label="Имя и фамилия" htmlFor="name">
						<Input
							id="name"
							value={form.name}
							minLength={3}
							onChange={(event) => patch({ name: event.target.value })}
							required
						/>
					</Field>

					<Field label="Email" htmlFor="email">
						<Input
							id="email"
							type="email"
							autoComplete="username"
							value={form.email}
							onChange={(event) => patch({ email: event.target.value })}
							required
						/>
					</Field>

					<Field label="Пароль" hint="Минимум 8 символов" htmlFor="password">
						<Input
							id="password"
							type="password"
							autoComplete="new-password"
							minLength={8}
							value={form.password}
							onChange={(event) => patch({ password: event.target.value })}
							required
						/>
					</Field>

					<Field
						label="Роль"
						hint="Выбор роли оставлен открытым, чтобы проверяющий мог завести обе учётки"
						htmlFor="role"
					>
						<Select
							id="role"
							value={form.role}
							onChange={(event) => patch({ role: event.target.value as UserRole })}
						>
							<option value="worker">Сборщик/фасовщик</option>
							<option value="admin">Администратор</option>
						</Select>
					</Field>

					{error && <ErrorMessage>{error}</ErrorMessage>}

					<Button type="submit" variant="primary" loading={isSubmitting}>
						Зарегистрироваться
					</Button>
				</form>

				<p className={s.footer}>
					Уже есть аккаунт? <Link href="/login">Войти</Link>
				</p>
			</div>
		</div>
	);
}
