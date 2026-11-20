'use client';
import { addDays, Button, Field, formatDayMonth, Input, Select, startOfWeek, toDateInputValue } from '@/shared';
import type { MachineType, ShiftType } from '@/shared';
import s from './schedule-features.module.scss';

export interface ScheduleFilterState {
	weekStart: string;
	machineType: MachineType | 'all';
	shiftType: ShiftType | 'all';
	search: string;
	onlyBusy: boolean;
}

export function currentWeekStart(): string {
	return toDateInputValue(startOfWeek(new Date()));
}

export function weekRange(weekStart: string): { from: string; to: string } {
	const start = new Date(`${weekStart}T00:00:00`);
	return { from: weekStart, to: toDateInputValue(addDays(start, 6)) };
}

interface ScheduleFiltersProps {
	value: ScheduleFilterState;
	onChange: (next: ScheduleFilterState) => void;
}

/** Панель фильтров из макета ТЗ: неделя, вид, смена, фамилия, «только занятые». */
export function ScheduleFilters({ value, onChange }: ScheduleFiltersProps) {
	const { from, to } = weekRange(value.weekStart);
	const patch = (partial: Partial<ScheduleFilterState>) => onChange({ ...value, ...partial });

	const shiftWeek = (deltaDays: number) => {
		const next = addDays(new Date(`${value.weekStart}T00:00:00`), deltaDays);
		patch({ weekStart: toDateInputValue(next) });
	};

	return (
		<div className={s.filters}>
			<Field label="Неделя">
				<div className={s.weekNav}>
					<Button size="small" onClick={() => shiftWeek(-7)} aria-label="Предыдущая неделя">
						←
					</Button>
					<span className={s.weekLabel}>
						{formatDayMonth(from)} — {formatDayMonth(to)}
					</span>
					<Button size="small" onClick={() => shiftWeek(7)} aria-label="Следующая неделя">
						→
					</Button>
					<Button size="small" variant="ghost" onClick={() => patch({ weekStart: currentWeekStart() })}>
						Сегодня
					</Button>
				</div>
			</Field>

			<Field label="Вид" htmlFor="filter-type">
				<Select
					id="filter-type"
					value={value.machineType}
					onChange={(event) => patch({ machineType: event.target.value as MachineType | 'all' })}
				>
					<option value="all">Станки и столы</option>
					<option value="machine">Станки</option>
					<option value="table">Столы</option>
				</Select>
			</Field>

			<Field label="Смена" htmlFor="filter-shift">
				<Select
					id="filter-shift"
					value={value.shiftType}
					onChange={(event) => patch({ shiftType: event.target.value as ShiftType | 'all' })}
				>
					<option value="all">День и ночь</option>
					<option value="day">День</option>
					<option value="night">Ночь</option>
				</Select>
			</Field>

			<div className={s.grow}>
				<Field label="Фильтр по фамилии" htmlFor="filter-search">
					<Input
						id="filter-search"
						value={value.search}
						placeholder="Например: Петрова"
						onChange={(event) => patch({ search: event.target.value })}
					/>
				</Field>
			</div>

			<label className={s.checkbox}>
				<input
					type="checkbox"
					checked={value.onlyBusy}
					onChange={(event) => patch({ onlyBusy: event.target.checked })}
				/>
				Только занятые
			</label>
		</div>
	);
}
