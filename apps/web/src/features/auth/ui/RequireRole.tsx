'use client';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { Loading } from '@/shared';
import type { UserRole } from '@/shared';
import { homeRouteFor, useAuth } from '../model';

/**
 * Защита страницы: неавторизованных отправляет на вход,
 * а пользователей с другой ролью — на их собственный раздел.
 */
export function RequireRole({ role, children }: { role?: UserRole; children: ReactNode }) {
	const { user, isAuthenticated, isLoading } = useAuth();
	const router = useRouter();
	const roleMismatch = Boolean(role && user && user.role !== role);

	useEffect(() => {
		if (isLoading) return;
		if (!isAuthenticated) {
			router.replace('/login');
			return;
		}
		if (roleMismatch && user) {
			router.replace(homeRouteFor(user.role));
		}
	}, [isAuthenticated, isLoading, roleMismatch, router, user]);

	if (isLoading || !isAuthenticated || roleMismatch) {
		return <Loading label="Проверяем доступ…" />;
	}
	return <>{children}</>;
}
