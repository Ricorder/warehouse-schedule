'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/shared';

export function usePausePresets() {
	const trpc = useTRPC();
	return useQuery(trpc.pause.getPresets.queryOptions(undefined, { staleTime: Infinity }));
}

export function useStartPause() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	return useMutation(
		trpc.pause.startPause.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.session.getCurrent.queryKey() }),
		}),
	);
}

export function useEndPause() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	return useMutation(
		trpc.pause.endPause.mutationOptions({
			onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.session.getCurrent.queryKey() }),
		}),
	);
}
