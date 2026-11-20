'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/shared';

/** Текущая смена сотрудника. Периодический рефетч подхватывает правки администратора. */
export function useCurrentShift() {
	const trpc = useTRPC();
	return useQuery(
		trpc.session.getCurrent.queryOptions(undefined, {
			refetchInterval: 30_000,
			staleTime: 0,
		}),
	);
}

export function useMyHistory(range: { from: string; to: string }) {
	const trpc = useTRPC();
	return useQuery(trpc.session.getMyHistory.queryOptions(range));
}

function useInvalidateCurrentShift() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: trpc.session.getCurrent.queryKey() });
}

export function useStartSession() {
	const trpc = useTRPC();
	const invalidate = useInvalidateCurrentShift();
	return useMutation(trpc.session.startSession.mutationOptions({ onSuccess: invalidate }));
}

export function useStopSession() {
	const trpc = useTRPC();
	const invalidate = useInvalidateCurrentShift();
	return useMutation(trpc.session.stopSession.mutationOptions({ onSuccess: invalidate }));
}

export function useAddComment() {
	const trpc = useTRPC();
	const invalidate = useInvalidateCurrentShift();
	return useMutation(trpc.session.addComment.mutationOptions({ onSuccess: invalidate }));
}

/** Корректировка времени администратором — обновляет и расписание, и журнал. */
export function useAdjustSession() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	return useMutation(
		trpc.session.adjustSession.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: trpc.shift.getSchedule.queryKey() }),
					queryClient.invalidateQueries({ queryKey: trpc.log.getLogs.queryKey() }),
				]);
			},
		}),
	);
}
