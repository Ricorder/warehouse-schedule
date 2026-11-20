'use client';
import { useState } from 'react';
import { useMyHistory } from '@/entities';
import { RequireRole } from '@/features';
import {
	addDays,
	Card,
	CardBody,
	CardHeader,
	EmptyState,
	ErrorMessage,
	Field,
	formatDate,
	formatDuration,
	Input,
	InfoMessage,
	Loading,
	machineTypeLabel,
	shiftLabel,
	toDateInputValue,
} from '@/shared';
import { AppShell } from '@/widgets';
import s from './history.module.scss';

const STATUS_LABEL = {
	working: '▸ в работе',
	paused: '⏸ пауза',
	stopped: '■ завершена',
	idle: '○ не начата',
} as const;

export function HistoryPage() {
	return (
		<RequireRole role="worker">
			<AppShell>
				<History />
			</AppShell>
		</RequireRole>
	);
}

function History() {
	const [range, setRange] = useState(() => ({
		from: toDateInputValue(addDays(new Date(), -13)),
		to: toDateInputValue(new Date()),
	}));
	const { data, isPending, isError, error } = useMyHistory(range);

	return (
		<Card>
			<CardHeader>
				<h1>История смен</h1>
				<div className={s.range}>
					<Field label="С" htmlFor="from">
						<Input
							id="from"
							type="date"
							value={range.from}
							onChange={(event) => setRange({ ...range, from: event.target.value })}
						/>
					</Field>
					<Field label="По" htmlFor="to">
						<Input
							id="to"
							type="date"
							value={range.to}
							onChange={(event) => setRange({ ...range, to: event.target.value })}
						/>
					</Field>
				</div>
			</CardHeader>

			<CardBody>
				<InfoMessage>
					История доступна только для просмотра. Изменить время может администратор — правка попадёт в
					журнал действий.
				</InfoMessage>

				{isPending && <Loading />}
				{isError && <ErrorMessage>{error.message}</ErrorMessage>}

				{data && data.items.length === 0 && <EmptyState>За выбранный период смен нет</EmptyState>}

				{data && data.items.length > 0 && (
					<>
						<table className={s.table}>
							<thead>
								<tr>
									<th>Дата</th>
									<th>Смена</th>
									<th>Рабочее место</th>
									<th>Статус</th>
									<th className={s.numeric}>В работе</th>
									<th className={s.numeric}>Паузы</th>
									<th className={s.numeric}>Итого</th>
								</tr>
							</thead>
							<tbody>
								{data.items.map((item) => (
									<tr key={item.assignmentId}>
										<td>{formatDate(item.shiftDate)}</td>
										<td>{shiftLabel(item.shiftType)}</td>
										<td>
											{machineTypeLabel(item.machineType)} · {item.machineName}
										</td>
										<td>{STATUS_LABEL[item.status]}</td>
										<td className={s.numeric}>{formatDuration(item.workMs)}</td>
										<td className={s.numeric}>{formatDuration(item.pauseMs)}</td>
										<td className={s.numeric}>{formatDuration(item.totalMs)}</td>
									</tr>
								))}
							</tbody>
							<tfoot>
								<tr>
									<td colSpan={4}>Итого за период</td>
									<td className={s.numeric}>{formatDuration(data.summary.workMs)}</td>
									<td className={s.numeric}>{formatDuration(data.summary.pauseMs)}</td>
									<td className={s.numeric}>{formatDuration(data.summary.totalMs)}</td>
								</tr>
							</tfoot>
						</table>
					</>
				)}
			</CardBody>
		</Card>
	);
}
