'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/shared';
import type { MachineType, ShiftType } from '@/shared';

export interface ScheduleFilters {
	from: string;
	to: string;
	shiftType?: ShiftType;
	machineType?: MachineType;
	search?: string;
	onlyBusy?: boolean;
}

export function useSchedule(filters: ScheduleFilters, enabled = true) {
	const trpc = useTRPC();
	return useQuery(
		trpc.shift.getSchedule.queryOptions(filters, {
			enabled,
			// Расписание показывает живые статусы ▸/⏸/■ — обновляем регулярно.
			refetchInterval: 30_000,
		}),
	);
}

function useScheduleInvalidation() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	return async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: trpc.shift.getSchedule.queryKey() }),
			queryClient.invalidateQueries({ queryKey: trpc.employee.getAssignable.queryKey() }),
			queryClient.invalidateQueries({ queryKey: trpc.log.getLogs.queryKey() }),
		]);
	};
}

export function useAssignEmployee() {
	const trpc = useTRPC();
	const invalidate = useScheduleInvalidation();
	return useMutation(trpc.shift.assignEmployee.mutationOptions({ onSuccess: invalidate }));
}

export function useUnassignEmployee() {
	const trpc = useTRPC();
	const invalidate = useScheduleInvalidation();
	return useMutation(trpc.shift.unassignEmployee.mutationOptions({ onSuccess: invalidate }));
}
