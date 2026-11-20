'use client';
import { useMemo, useState } from 'react';
import { useSchedule } from '@/entities';
import {
	currentWeekStart,
	RequireRole,
	ScheduleFilters,
	type ScheduleFilterState,
	weekRange,
} from '@/features';
import { Card, CardBody, CardHeader, ErrorMessage, Loading } from '@/shared';
import { AppShell, EmployeeTotals, ScheduleTable } from '@/widgets';

export function AdminSchedulePage() {
	return (
		<RequireRole role="admin">
			<AppShell>
				<AdminSchedule />
			</AppShell>
		</RequireRole>
	);
}

function AdminSchedule() {
	const [filters, setFilters] = useState<ScheduleFilterState>(() => ({
		weekStart: currentWeekStart(),
		machineType: 'all',
		shiftType: 'all',
		search: '',
		onlyBusy: false,
	}));

	const query = useMemo(() => {
		const { from, to } = weekRange(filters.weekStart);
		return {
			from,
			to,
			machineType: filters.machineType === 'all' ? undefined : filters.machineType,
			shiftType: filters.shiftType === 'all' ? undefined : filters.shiftType,
			search: filters.search.trim() || undefined,
			onlyBusy: filters.onlyBusy || undefined,
		};
	}, [filters]);

	const { data, isPending, isError, error } = useSchedule(query);

	return (
		<>
			<Card>
				<CardHeader>
					<h1>Распределение по станкам и сменам</h1>
				</CardHeader>
				<CardBody>
					<ScheduleFilters value={filters} onChange={setFilters} />
				</CardBody>
			</Card>

			<Card>
				<CardBody>
					{isPending && <Loading label="Загружаем расписание…" />}
					{isError && <ErrorMessage>{error.message}</ErrorMessage>}
					{data && <ScheduleTable schedule={data} />}
				</CardBody>
			</Card>

			{data && (
				<Card>
					<CardHeader>
						<h2>Общее время работы за неделю</h2>
					</CardHeader>
					<CardBody>
						<EmployeeTotals totals={data.totals} />
					</CardBody>
				</Card>
			)}
		</>
	);
}
