'use client';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/shared';

export function useActivityLog(filters: { employeeId?: string; from?: string; to?: string; limit?: number }) {
	const trpc = useTRPC();
	return useQuery(trpc.log.getLogs.queryOptions(filters));
}
