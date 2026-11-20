'use client';
import { useEffect, useRef, useState } from 'react';
import { useAssignableEmployees, useAssignEmployee } from '@/entities';
import { cx } from '@/shared';
import type { ShiftType } from '@/shared';
import s from './schedule-features.module.scss';

interface AssignEmployeeMenuProps {
	machineId: string;
	machineName: string;
	shiftDate: string;
	shiftType: ShiftType;
	/** Сколько человек уже стоит в ячейке — нужно для лимита. */
	occupied: number;
	limit: number;
	onError: (message: string) => void;
}

/** Выпадающий список «(+) ▼» из ТЗ: занятые сотрудники подсвечены жёлтым. */
export function AssignEmployeeMenu({
	machineId,
	machineName,
	shiftDate,
	shiftType,
	occupied,
	limit,
	onError,
}: AssignEmployeeMenuProps) {
	const [open, setOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const { data: employees = [], isPending } = useAssignableEmployees({ shiftDate, shiftType }, open);
	const assign = useAssignEmployee();
	const isFull = occupied >= limit;

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: MouseEvent) => {
			if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setOpen(false);
		};
		document.addEventListener('mousedown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('mousedown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [open]);

	const handleAssign = async (employeeId: string) => {
		try {
			await assign.mutateAsync({ employeeId, machineId, shiftDate, shiftType });
			setOpen(false);
		} catch (cause) {
			onError(cause instanceof Error ? cause.message : 'Не удалось назначить сотрудника');
		}
	};

	return (
		<div className={s.addWrapper} ref={wrapperRef}>
			<button
				type="button"
				className={s.addButton}
				disabled={isFull}
				title={isFull ? `Максимум ${limit} сотрудников на рабочем месте` : 'Добавить сотрудника'}
				onClick={() => setOpen((value) => !value)}
			>
				{isFull ? `Занято ${occupied}/${limit}` : '(+) ▼'}
			</button>

			{open && (
				<div className={s.dropdown} role="listbox">
					<div className={s.dropdownTitle}>
						{machineName} · {shiftType === 'day' ? 'день' : 'ночь'} · {shiftDate}
					</div>
					{isPending && <div className={s.option}>Загрузка…</div>}
					{!isPending && employees.length === 0 && <div className={s.option}>Сотрудников нет</div>}
					{employees.map((employee) => (
						<button
							key={employee.id}
							type="button"
							role="option"
							aria-selected={false}
							className={cx(s.option, employee.busy && s.optionBusy)}
							disabled={employee.busy || assign.isPending}
							title={employee.busy ? `Уже занят: ${employee.busyMachineName}` : undefined}
							onClick={() => handleAssign(employee.id)}
						>
							<span>{employee.name}</span>
							{employee.busy && <span className={s.optionNote}>занят · {employee.busyMachineName}</span>}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
