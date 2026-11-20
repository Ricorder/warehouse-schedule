'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { type ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/features';
import { Button, cx } from '@/shared';
import s from './AppShell.module.scss';

const NAV_BY_ROLE = {
	admin: [
		{ href: '/admin', label: 'Расписание' },
		{ href: '/admin/log', label: 'Журнал действий' },
	],
	worker: [
		{ href: '/worker', label: 'Моя смена' },
		{ href: '/worker/history', label: 'История' },
	],
} as const;

export function AppShell({ children }: { children: ReactNode }) {
	const { user, logout } = useAuth();
	const pathname = usePathname();
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// Тема известна только на клиенте — иначе разъедется гидратация.
	useEffect(() => setMounted(true), []);

	const links = user ? NAV_BY_ROLE[user.role] : [];

	return (
		<div className={s.shell}>
			<header className={s.header}>
				<div className={s.brand}>
					<span className={s.brandTitle}>Учёт рабочего времени</span>
					<span className={s.brandSubtitle}>Склад · станки и столы</span>
				</div>

				<nav className={s.nav}>
					{links.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className={cx(s.navLink, pathname === link.href && s.navLinkActive)}
						>
							{link.label}
						</Link>
					))}
				</nav>

				<div className={s.user}>
					{user && (
						<div className={s.userInfo}>
							<span className={s.userName}>{user.name}</span>
							<span className={s.userRole}>
								{user.role === 'admin' ? 'Администратор' : 'Сборщик/фасовщик'}
							</span>
						</div>
					)}
					{mounted && (
						<Button
							size="small"
							variant="ghost"
							aria-label="Сменить тему"
							onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
						>
							{resolvedTheme === 'dark' ? '☀' : '☾'}
						</Button>
					)}
					<Button size="small" onClick={logout}>
						Выйти
					</Button>
				</div>
			</header>

			<main className={s.main}>{children}</main>
		</div>
	);
}
