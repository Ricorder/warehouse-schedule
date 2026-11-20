'use client';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { type ReactNode, useState } from 'react';
import superjson from 'superjson';
import { getAccessToken } from '../../lib/auth-token';
import type { AppRouter } from './@generated/server';
import { TRPCProvider } from './client';
import { makeQueryClient } from './query-client';

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
	if (typeof window === 'undefined') return makeQueryClient();
	browserQueryClient ??= makeQueryClient();
	return browserQueryClient;
}

function getUrl(): string {
	const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
	return `${base}/trpc`;
}

export function TRPCReactProvider({ children }: Readonly<{ children: ReactNode }>) {
	const queryClient = getQueryClient();
	const [trpcClient] = useState(() =>
		createTRPCClient<AppRouter>({
			links: [
				httpBatchLink({
					transformer: superjson,
					url: getUrl(),
					// Токен читается на каждом запросе из общего хранилища,
					// поэтому вход и выход применяются сразу.
					headers() {
						const token = getAccessToken();
						return token ? { Authorization: `Bearer ${token}` } : {};
					},
				}),
			],
		}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			<TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
				{children}
			</TRPCProvider>
		</QueryClientProvider>
	);
}
