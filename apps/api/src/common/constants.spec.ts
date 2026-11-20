import { MAX_EMPLOYEES_PER_MACHINE, PAUSE_PRESETS, resolveIsProductive } from './constants';

describe('ограничение по числу сотрудников', () => {
	it('соответствует ТЗ — 6 человек на станке', () => {
		expect(MAX_EMPLOYEES_PER_MACHINE).toBe(6);
	});
});

describe('resolveIsProductive', () => {
	it('«Вызвали помочь» — продуктивная пауза, даже если клиент прислал false', () => {
		expect(resolveIsProductive('Вызвали помочь', false)).toBe(true);
	});

	it('«Обед» — непродуктивная, даже если клиент прислал true', () => {
		expect(resolveIsProductive('Обед', true)).toBe(false);
	});

	it('сравнение причины нечувствительно к регистру и пробелам', () => {
		expect(resolveIsProductive('  вызвали помочь  ', false)).toBe(true);
	});

	it('для произвольной причины берёт флаг из запроса', () => {
		expect(resolveIsProductive('Забирал паллеты', true)).toBe(true);
		expect(resolveIsProductive('Забирал паллеты', false)).toBe(false);
	});

	it('все типовые причины из ТЗ присутствуют', () => {
		expect(PAUSE_PRESETS.map((p) => p.reason)).toEqual(['Обед', 'Курить', 'Вызвали помочь']);
	});
});
