'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { getAccessToken, setAccessToken, useAccessToken, useTRPC } from '@/shared';
import type { UserRole } from '@/shared';

export interface AuthUser {
	id: string;
	name: string;
	email: string;
	role: UserRole;
}

export function useAuth() {
	const trpc = useTRPC();
	const router = useRouter();
	const queryClient = useQueryClient();
	const token = useAccessToken();

	const profile = useQuery(trpc.auth.getMe.queryOptions(undefined, { enabled: Boolean(token) }));

	// Протухший или испорченный токен — выкидываем, чтобы не зациклиться на 401.
	useEffect(() => {
		if (profile.isError && getAccessToken()) {
			setAccessToken(null);
			queryClient.clear();
		}
	}, [profile.isError, queryClient]);

	const signIn = useMutation(trpc.auth.signIn.mutationOptions());
	const signUp = useMutation(trpc.auth.signUp.mutationOptions());

	const login = useCallback(
		async (email: string, password: string) => {
			const session = await signIn.mutateAsync({ email, password });
			setAccessToken(session.accessToken);
			await queryClient.invalidateQueries();
			return session.user;
		},
		[signIn, queryClient],
	);

	const register = useCallback(
		async (input: { name: string; email: string; password: string; role: UserRole }) => {
			const session = await signUp.mutateAsync(input);
			setAccessToken(session.accessToken);
			await queryClient.invalidateQueries();
			return session.user;
		},
		[signUp, queryClient],
	);

	const logout = useCallback(() => {
		setAccessToken(null);
		queryClient.clear();
		router.replace('/login');
	}, [queryClient, router]);

	// Пока токен не прочитан из localStorage, считаем состояние загрузкой —
	// иначе гвард редиректит на вход при каждой перезагрузке страницы.
	const isHydrated = token !== undefined;

	return {
		user: (profile.data ?? null) as AuthUser | null,
		isAuthenticated: Boolean(token) && Boolean(profile.data),
		isLoading: !isHydrated || (Boolean(token) && profile.isPending),
		login,
		register,
		logout,
		isSubmitting: signIn.isPending || signUp.isPending,
	};
}

/** Куда отправить пользователя после входа. */
export function homeRouteFor(role: UserRole): string {
	return role === 'admin' ? '/admin' : '/worker';
}
