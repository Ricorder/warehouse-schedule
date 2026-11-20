'use client';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/shared';
import type { ShiftType, UserRole } from '@/shared';

export function useEmployees(filters: { role?: UserRole; search?: string } = {}, enabled = true) {
	const trpc = useTRPC();
	return useQuery(trpc.employee.getEmployees.queryOptions(filters, { enabled, staleTime: 5 * 60_000 }));
}

/** Список для выпадающего меню «(+)»: занятые в этой смене приходят с флагом busy. */
export function useAssignableEmployees(
	params: { shiftDate: string; shiftType: ShiftType },
	enabled: boolean,
) {
	const trpc = useTRPC();
	return useQuery(trpc.employee.getAssignable.queryOptions(params, { enabled }));
}
