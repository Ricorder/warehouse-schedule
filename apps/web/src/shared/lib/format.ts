const SHIFT_LABELS = { day: 'День', night: 'Ночь' } as const;
const MACHINE_TYPE_LABELS = { machine: 'Станок', table: 'Стол' } as const;

/** «3:45» — часы и минуты, как в макете ТЗ. */
export function formatDuration(ms: number): string {
	const totalMinutes = Math.floor(Math.max(0, ms) / 60_000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/** «3:45:07» — для тикающего таймера текущей смены. */
export function formatDurationWithSeconds(ms: number): string {
	const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** «16.07.2025» из ISO-строки или 'YYYY-MM-DD'. */
export function formatDate(value: string): string {
	const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** «16.07» — компактная подпись колонки в таблице расписания. */
export function formatDayMonth(value: string): string {
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

export function formatWeekday(value: string): string {
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleDateString('ru-RU', { weekday: 'short' });
}

/** «08:00» из ISO-строки. */
export function formatTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/** Значение для <input type="datetime-local"> в местном времени. */
export function toDateTimeLocal(value: string | null): string {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	const offset = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function shiftLabel(shift: 'day' | 'night'): string {
	return SHIFT_LABELS[shift];
}

export function machineTypeLabel(type: 'machine' | 'table'): string {
	return MACHINE_TYPE_LABELS[type];
}

export function isToday(date: string): boolean {
	return date === toDateInputValue(new Date());
}

/** 'YYYY-MM-DD' по местному времени. */
export function toDateInputValue(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** Понедельник недели, в которую попадает дата. */
export function startOfWeek(date: Date): Date {
	const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const weekday = (result.getDay() + 6) % 7;
	result.setDate(result.getDate() - weekday);
	return result;
}

export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}
