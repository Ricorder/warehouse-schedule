import {
	calculateSessionDurations,
	formatDurationShort,
	type PauseInterval,
	resolveSessionStatus,
	sumDurations,
} from './time.util';

const HOUR = 3_600_000;
const MINUTE = 60_000;

/** 2025-07-16, 08:00 — начало смены из примера в ТЗ. */
const START = new Date('2025-07-16T08:00:00.000Z');
const at = (hours: number, minutes = 0) => new Date(START.getTime() + hours * HOUR + minutes * MINUTE);

describe('calculateSessionDurations', () => {
	it('без пауз рабочее время равно полной длительности смены', () => {
		const result = calculateSessionDurations({ startedAt: START, stoppedAt: at(8) }, []);
		expect(result.totalMs).toBe(8 * HOUR);
		expect(result.workMs).toBe(8 * HOUR);
		expect(result.pauseMs).toBe(0);
	});

	it('непродуктивная пауза вычитается из рабочего времени', () => {
		const pauses: PauseInterval[] = [
			{ startedAt: at(4), endedAt: at(4, 45), isProductive: false }, // обед 45 мин
		];
		const result = calculateSessionDurations({ startedAt: START, stoppedAt: at(8) }, pauses);
		expect(result.totalMs).toBe(8 * HOUR);
		expect(result.pauseMs).toBe(45 * MINUTE);
		expect(result.workMs).toBe(8 * HOUR - 45 * MINUTE);
	});

	it('продуктивная пауза («вызвали помочь») остаётся в рабочем времени', () => {
		const pauses: PauseInterval[] = [
			{ startedAt: at(2), endedAt: at(2, 30), isProductive: true },
		];
		const result = calculateSessionDurations({ startedAt: START, stoppedAt: at(8) }, pauses);
		expect(result.workMs).toBe(8 * HOUR);
		expect(result.pauseMs).toBe(0);
		expect(result.productivePauseMs).toBe(30 * MINUTE);
	});

	it('разделяет продуктивные и непродуктивные паузы в одной смене', () => {
		const pauses: PauseInterval[] = [
			{ startedAt: at(2, 25), endedAt: at(2, 35), isProductive: false }, // курить 10 мин
			{ startedAt: at(3, 45), endedAt: at(4, 30), isProductive: false }, // обед 45 мин
			{ startedAt: at(5), endedAt: at(5, 20), isProductive: true }, // помогал 20 мин
		];
		const result = calculateSessionDurations({ startedAt: START, stoppedAt: at(8) }, pauses);
		expect(result.pauseMs).toBe(55 * MINUTE);
		expect(result.productivePauseMs).toBe(20 * MINUTE);
		expect(result.workMs).toBe(8 * HOUR - 55 * MINUTE);
		expect(result.workMs + result.pauseMs).toBe(result.totalMs);
	});

	it('незавершённая смена считается до текущего момента', () => {
		const result = calculateSessionDurations({ startedAt: START, stoppedAt: null }, [], at(3));
		expect(result.totalMs).toBe(3 * HOUR);
		expect(result.workMs).toBe(3 * HOUR);
	});

	it('незакрытая пауза тянется до текущего момента', () => {
		const pauses: PauseInterval[] = [{ startedAt: at(2), endedAt: null, isProductive: false }];
		const result = calculateSessionDurations({ startedAt: START, stoppedAt: null }, pauses, at(3));
		expect(result.pauseMs).toBe(1 * HOUR);
		expect(result.workMs).toBe(2 * HOUR);
	});

	it('незакрытая пауза при завершённой смене обрезается концом смены', () => {
		const pauses: PauseInterval[] = [{ startedAt: at(7), endedAt: null, isProductive: false }];
		const result = calculateSessionDurations({ startedAt: START, stoppedAt: at(8) }, pauses, at(20));
		expect(result.pauseMs).toBe(1 * HOUR);
		expect(result.workMs).toBe(7 * HOUR);
	});

	it('пауза за пределами смены обрезается её границами', () => {
		const pauses: PauseInterval[] = [
			{ startedAt: new Date(START.getTime() - 2 * HOUR), endedAt: at(1), isProductive: false },
		];
		const result = calculateSessionDurations({ startedAt: START, stoppedAt: at(8) }, pauses);
		expect(result.pauseMs).toBe(1 * HOUR);
	});

	it('не уходит в минус, если пауз больше, чем самой смены', () => {
		const pauses: PauseInterval[] = [
			{ startedAt: START, endedAt: at(8), isProductive: false },
			{ startedAt: START, endedAt: at(8), isProductive: false },
		];
		const result = calculateSessionDurations({ startedAt: START, stoppedAt: at(8) }, pauses);
		expect(result.workMs).toBe(0);
		expect(result.pauseMs).toBe(8 * HOUR);
	});

	it('смена «в будущем» не даёт отрицательной длительности', () => {
		const future = new Date(START.getTime() + HOUR);
		const result = calculateSessionDurations({ startedAt: future, stoppedAt: null }, [], START);
		expect(result.totalMs).toBe(0);
		expect(result.workMs).toBe(0);
	});
});

describe('resolveSessionStatus', () => {
	it('без смены — idle', () => {
		expect(resolveSessionStatus(null)).toBe('idle');
	});

	it('идущая смена без активных пауз — working', () => {
		expect(resolveSessionStatus({ startedAt: START, stoppedAt: null }, [])).toBe('working');
	});

	it('идущая смена с незакрытой паузой — paused', () => {
		const pauses: PauseInterval[] = [{ startedAt: at(1), endedAt: null, isProductive: false }];
		expect(resolveSessionStatus({ startedAt: START, stoppedAt: null }, pauses)).toBe('paused');
	});

	it('завершённая смена — stopped, даже если пауза осталась открытой', () => {
		const pauses: PauseInterval[] = [{ startedAt: at(1), endedAt: null, isProductive: false }];
		expect(resolveSessionStatus({ startedAt: START, stoppedAt: at(8) }, pauses)).toBe('stopped');
	});
});

describe('sumDurations', () => {
	it('складывает несколько смен', () => {
		const first = calculateSessionDurations({ startedAt: START, stoppedAt: at(8) }, [
			{ startedAt: at(4), endedAt: at(4, 30), isProductive: false },
		]);
		const second = calculateSessionDurations({ startedAt: START, stoppedAt: at(4) }, []);
		const total = sumDurations([first, second]);
		expect(total.totalMs).toBe(12 * HOUR);
		expect(total.pauseMs).toBe(30 * MINUTE);
		expect(total.workMs).toBe(12 * HOUR - 30 * MINUTE);
	});

	it('пустой список даёт нули', () => {
		expect(sumDurations([])).toEqual({ totalMs: 0, pauseMs: 0, productivePauseMs: 0, workMs: 0 });
	});
});

describe('formatDurationShort', () => {
	it.each([
		[0, '< 1 мин'],
		[30_000, '< 1 мин'],
		[10 * MINUTE, '10 мин'],
		[HOUR, '1 ч'],
		[3 * HOUR + 45 * MINUTE, '3 ч 45 мин'],
	])('%i мс → %s', (ms, expected) => {
		expect(formatDurationShort(ms)).toBe(expected);
	});
});
