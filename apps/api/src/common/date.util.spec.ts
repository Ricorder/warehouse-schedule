import { enumerateDates, guessShiftType, toShiftDate } from './date.util';

describe('toShiftDate', () => {
	it('форматирует дату как YYYY-MM-DD', () => {
		expect(toShiftDate(new Date(2025, 6, 16, 15, 30))).toBe('2025-07-16');
	});

	it('дополняет месяц и день нулями', () => {
		expect(toShiftDate(new Date(2025, 0, 5))).toBe('2025-01-05');
	});
});

describe('guessShiftType', () => {
	it.each([
		[8, 'day'],
		[12, 'day'],
		[19, 'day'],
		[20, 'night'],
		[23, 'night'],
		[3, 'night'],
		[7, 'night'],
	])('в %i часов — смена %s', (hour, expected) => {
		expect(guessShiftType(new Date(2025, 6, 16, hour))).toBe(expected);
	});
});

describe('enumerateDates', () => {
	it('перечисляет неделю из ТЗ включительно', () => {
		expect(enumerateDates('2025-07-14', '2025-07-18')).toEqual([
			'2025-07-14',
			'2025-07-15',
			'2025-07-16',
			'2025-07-17',
			'2025-07-18',
		]);
	});

	it('одна дата даёт один элемент', () => {
		expect(enumerateDates('2025-07-14', '2025-07-14')).toEqual(['2025-07-14']);
	});

	it('корректно переходит через границу месяца', () => {
		expect(enumerateDates('2025-07-30', '2025-08-02')).toEqual([
			'2025-07-30',
			'2025-07-31',
			'2025-08-01',
			'2025-08-02',
		]);
	});

	it('перевёрнутый диапазон даёт пустой список', () => {
		expect(enumerateDates('2025-07-18', '2025-07-14')).toEqual([]);
	});

	it('ограничивает слишком большой диапазон', () => {
		expect(enumerateDates('2025-01-01', '2025-12-31')).toHaveLength(31);
	});
});
