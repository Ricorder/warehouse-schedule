'use client';
import { EmptyState, formatDuration } from '@/shared';
import type { EmployeeTotal } from '@/shared';
import s from './EmployeeTotals.module.scss';

/** ТЗ: «Подсчет общего времени работы каждого сотрудника» за показанный период. */
export function EmployeeTotals({ totals }: { totals: EmployeeTotal[] }) {
	if (totals.length === 0) {
		return <EmptyState>За выбранный период смен нет</EmptyState>;
	}

	return (
		<table className={s.table}>
			<thead>
				<tr>
					<th>Сотрудник</th>
					<th className={s.numeric}>Смен</th>
					<th className={s.numeric}>В работе</th>
					<th className={s.numeric}>Паузы</th>
					<th className={s.numeric}>Итого</th>
				</tr>
			</thead>
			<tbody>
				{totals.map((total) => (
					<tr key={total.employeeId}>
						<td>{total.employeeName}</td>
						<td className={s.numeric}>{total.shiftsCount}</td>
						<td className={`${s.numeric} ${s.work}`}>{formatDuration(total.workMs)}</td>
						<td className={s.numeric}>{formatDuration(total.pauseMs)}</td>
						<td className={s.numeric}>{formatDuration(total.totalMs)}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
