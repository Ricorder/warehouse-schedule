'use client';
import { cx, EmptyState, formatDate, formatTime } from '@/shared';
import type { ActivityLogEntry } from '@/shared';
import s from './ActivityLogTable.module.scss';

const ACTION_VIEW: Record<ActivityLogEntry['action'], { label: string; className?: string }> = {
	start: { label: 'Старт', className: s.badgeWork },
	stop: { label: 'Стоп', className: s.badgeNeutral },
	pause: { label: 'Пауза', className: s.badgePause },
	resume: { label: 'Возврат', className: s.badgeWork },
	comment: { label: 'Комментарий', className: s.badgeNeutral },
	admin_edit: { label: 'Правка времени', className: s.badgeAdmin },
	admin_assign: { label: 'Назначение', className: s.badgeAdmin },
	admin_unassign: { label: 'Снятие', className: s.badgeAdmin },
};

/** ТЗ: «Журнал действий (кто, когда, где работал, комментарии, паузы)». */
export function ActivityLogTable({ entries }: { entries: ActivityLogEntry[] }) {
	if (entries.length === 0) {
		return <EmptyState>Записей за выбранный период нет</EmptyState>;
	}

	return (
		<table className={s.table}>
			<thead>
				<tr>
					<th>Когда</th>
					<th>Кто</th>
					<th>Действие</th>
					<th>Подробности</th>
				</tr>
			</thead>
			<tbody>
				{entries.map((entry) => {
					const action = ACTION_VIEW[entry.action];
					return (
						<tr key={entry.id}>
							<td className={s.time}>
								{formatDate(entry.timestamp)} {formatTime(entry.timestamp)}
							</td>
							<td className={s.actor}>{entry.userName}</td>
							<td>
								<span className={cx(s.badge, action.className)}>{action.label}</span>
							</td>
							<td>{entry.description}</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}
