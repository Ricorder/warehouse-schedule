/** Дата смены в формате 'YYYY-MM-DD' по локальному времени сервера. */
export function toShiftDate(date: Date = new Date()): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/** Смена по времени суток — используется только как значение по умолчанию в UI. */
export function guessShiftType(date: Date = new Date()): 'day' | 'night' {
	const hours = date.getHours();
	return hours >= 8 && hours < 20 ? 'day' : 'night';
}

export const SHIFT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Максимум дней в одном запросе расписания — защита от случайного огромного диапазона. */
export const MAX_SCHEDULE_DAYS = 31;

/** Перечисляет даты диапазона включительно: ['2025-07-14', '2025-07-15', ...]. */
export function enumerateDates(from: string, to: string, maxDays = MAX_SCHEDULE_DAYS): string[] {
	const start = new Date(`${from}T00:00:00Z`);
	const end = new Date(`${to}T00:00:00Z`);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
		return [];
	}
	const dates: string[] = [];
	const cursor = new Date(start);
	while (cursor <= end && dates.length < maxDays) {
		dates.push(cursor.toISOString().slice(0, 10));
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}
	return dates;
}
