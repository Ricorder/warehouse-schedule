'use client';
import { useMemo, useState } from 'react';
import { useActivityLog, useEmployees } from '@/entities';
import { RequireRole } from '@/features';
import {
	addDays,
	Card,
	CardBody,
	CardHeader,
	ErrorMessage,
	Field,
	Input,
	Loading,
	Select,
	toDateInputValue,
} from '@/shared';
import { ActivityLogTable, AppShell } from '@/widgets';
import s from './admin.module.scss';

export function AdminLogPage() {
	return (
		<RequireRole role="admin">
			<AppShell>
				<AdminLog />
			</AppShell>
		</RequireRole>
	);
}

function AdminLog() {
	const [filters, setFilters] = useState(() => ({
		employeeId: '',
		from: toDateInputValue(addDays(new Date(), -7)),
		to: toDateInputValue(new Date()),
	}));

	const { data: employees = [] } = useEmployees();

	const query = useMemo(
		() => ({
			employeeId: filters.employeeId || undefined,
			from: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined,
			// Верхняя граница — конец выбранного дня, иначе сегодняшние записи выпадают.
			to: filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : undefined,
			limit: 200,
		}),
		[filters],
	);

	const { data, isPending, isError, error } = useActivityLog(query);

	return (
		<Card>
			<CardHeader>
				<h1>Журнал действий</h1>
			</CardHeader>
			<CardBody>
				<div className={s.filters}>
					<Field label="Сотрудник" htmlFor="log-employee">
						<Select
							id="log-employee"
							value={filters.employeeId}
							onChange={(event) => setFilters({ ...filters, employeeId: event.target.value })}
						>
							<option value="">Все сотрудники</option>
							{employees.map((employee) => (
								<option key={employee.id} value={employee.id}>
									{employee.name}
								</option>
							))}
						</Select>
					</Field>

					<Field label="С" htmlFor="log-from">
						<Input
							id="log-from"
							type="date"
							value={filters.from}
							onChange={(event) => setFilters({ ...filters, from: event.target.value })}
						/>
					</Field>

					<Field label="По" htmlFor="log-to">
						<Input
							id="log-to"
							type="date"
							value={filters.to}
							onChange={(event) => setFilters({ ...filters, to: event.target.value })}
						/>
					</Field>
				</div>

				{isPending && <Loading />}
				{isError && <ErrorMessage>{error.message}</ErrorMessage>}
				{data && <ActivityLogTable entries={data} />}
			</CardBody>
		</Card>
	);
}
