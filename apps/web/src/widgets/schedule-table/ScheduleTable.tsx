'use client';
import { useState } from 'react';
import { useUnassignEmployee } from '@/entities';
import { AdjustTimeDialog, AssignEmployeeMenu } from '@/features';
import { cx, EmptyState, ErrorMessage, formatDayMonth, formatDuration, formatWeekday, isToday } from '@/shared';
import type { Schedule, ScheduleEntry, SessionStatus } from '@/shared';
import s from './ScheduleTable.module.scss';

const STATUS_ICON: Record<SessionStatus, { icon: string; title: string; className?: string }> = {
	working: { icon: '▸', title: 'В работе', className: s.statusWorking },
	paused: { icon: '⏸', title: 'Пауза', className: s.statusPaused },
	stopped: { icon: '■', title: 'Смена остановлена', className: s.statusStopped },
	idle: { icon: '○', title: 'Смена не начата', className: s.statusIdle },
};

interface AdjustTarget {
	sessionId: string;
	employeeName: string;
	startedAt: string;
	stoppedAt: string | null;
}

/**
 * Недельная сетка из ТЗ: строки — «станок / смена», колонки — даты.
 * В ячейке до 6 сотрудников со статусом ▸/⏸/■ и выпадающим списком «(+)».
 */
export function ScheduleTable({ schedule }: { schedule: Schedule }) {
	const [error, setError] = useState<string | null>(null);
	const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
	const unassign = useUnassignEmployee();

	const handleRemove = async (entry: ScheduleEntry) => {
		setError(null);
		try {
			await unassign.mutateAsync({ assignmentId: entry.assignmentId });
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось снять сотрудника');
		}
	};

	if (schedule.rows.length === 0) {
		return <EmptyState>Под выбранные фильтры ничего не подошло</EmptyState>;
	}

	return (
		<>
			{error && (
				<div style={{ marginBottom: 12 }}>
					<ErrorMessage>{error}</ErrorMessage>
				</div>
			)}

			<div className={s.wrapper}>
				<table className={s.table}>
					<thead>
						<tr>
							<th className={cx(s.headCell, s.rowHead, s.rowHeadTop)}>Позиция \ дата</th>
							{schedule.dates.map((date) => (
								<th
									key={date}
									className={cx(s.headCell, isToday(date) && s.headToday)}
									scope="col"
								>
									{formatDayMonth(date)}
									<span className={s.weekday}>{formatWeekday(date)}</span>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{schedule.rows.map((row) => (
							<tr key={`${row.machineId}-${row.shiftType}`}>
								<th className={s.rowHead} scope="row">
									<div className={s.machineName}>{row.machineName}</div>
									<div className={s.shiftName}>{row.shiftType === 'day' ? 'День' : 'Ночь'}</div>
								</th>

								{row.cells.map((cell) => (
									<td
										key={cell.date}
										className={cx(s.cell, isToday(cell.date) && s.cellToday)}
									>
										{cell.entries.length > 0 && (
											<div className={s.entries}>
												{cell.entries.map((entry) => {
													const status = STATUS_ICON[entry.status];
													return (
														<div key={entry.assignmentId} className={s.entry}>
															<span className={s.entryName} title={entry.employeeName}>
																<span
																	className={cx(s.statusIcon, status.className)}
																	title={status.title}
																	aria-label={status.title}
																>
																	{status.icon}
																</span>
																{entry.employeeName}
															</span>

															<span className={s.entryActions}>
																{entry.workMs > 0 && (
																	<span
																		className={s.worked}
																		title="Продуктивное время"
																	>
																		{formatDuration(entry.workMs)}
																	</span>
																)}
																<button
																	type="button"
																	className={s.iconButton}
																	disabled={!entry.sessionId}
																	title={
																		entry.sessionId
																			? 'Скорректировать время'
																			: 'Смена ещё не начиналась'
																	}
																	onClick={() =>
																		entry.sessionId &&
																		setAdjustTarget({
																			sessionId: entry.sessionId,
																			employeeName: entry.employeeName,
																			startedAt: entry.sessionStartedAt ?? '',
																			stoppedAt: entry.sessionStoppedAt,
																		})
																	}
																>
																	✎
																</button>
																<button
																	type="button"
																	className={cx(s.iconButton, s.iconRemove)}
																	title="Снять со смены"
																	disabled={unassign.isPending}
																	onClick={() => handleRemove(entry)}
																>
																	✕
																</button>
															</span>
														</div>
													);
												})}
											</div>
										)}

										<AssignEmployeeMenu
											machineId={row.machineId}
											machineName={row.machineName}
											shiftDate={cell.date}
											shiftType={row.shiftType}
											occupied={cell.entries.length}
											limit={schedule.maxPerMachine}
											onError={setError}
										/>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className={s.legend} style={{ marginTop: 12 }}>
				<span className={s.legendItem}>
					<span className={s.statusWorking}>▸</span> в работе
				</span>
				<span className={s.legendItem}>
					<span className={s.statusPaused}>⏸</span> пауза
				</span>
				<span className={s.legendItem}>
					<span className={s.statusStopped}>■</span> смена остановлена
				</span>
				<span className={s.legendItem}>
					<span className={s.statusIdle}>○</span> назначен, не начал
				</span>
				<span className={s.legendItem}>✎ — корректировка времени · ✕ — снять со смены</span>
				<span className={s.legendItem}>максимум {schedule.maxPerMachine} человек на рабочем месте</span>
			</div>

			{adjustTarget && (
				<AdjustTimeDialog
					sessionId={adjustTarget.sessionId}
					employeeName={adjustTarget.employeeName}
					startedAt={adjustTarget.startedAt}
					stoppedAt={adjustTarget.stoppedAt}
					onClose={() => setAdjustTarget(null)}
				/>
			)}
		</>
	);
}
