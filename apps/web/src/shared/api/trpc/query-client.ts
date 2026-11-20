import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				// Отказ по правам не имеет смысла повторять.
				retry: false,
				refetchOnWindowFocus: false,
			},
		},
	});
}
