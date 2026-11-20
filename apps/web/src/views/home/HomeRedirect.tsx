'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { homeRouteFor, useAuth } from '@/features';
import { Loading } from '@/shared';

/** Разводит пользователя по разделу в зависимости от роли. */
export function HomeRedirect() {
	const { user, isAuthenticated, isLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (isLoading) return;
		router.replace(isAuthenticated && user ? homeRouteFor(user.role) : '/login');
	}, [isAuthenticated, isLoading, router, user]);

	return <Loading />;
}
