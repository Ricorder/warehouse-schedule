'use client';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/shared';
import type { MachineType } from '@/shared';

export function useMachines(type?: MachineType) {
	const trpc = useTRPC();
	return useQuery(trpc.machine.getMachines.queryOptions({ type }, { staleTime: 10 * 60_000 }));
}
