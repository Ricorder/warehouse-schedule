/**
 * Расчёт рабочего времени смены — ядро бизнес-логики ТЗ.
 *
 * «Время паузы не учитывается в продуктивное время, если это не продуктивная
 * пауза — такая как "вызвали помочь"».
 */

export interface PauseInterval {
	startedAt: Date;
	/** null — пауза ещё идёт. */
	endedAt: Date | null;
	isProductive: boolean;
}

export interface SessionInterval {
	startedAt: Date;
	/** null — смена ещё идёт. */
	stoppedAt: Date | null;
}

export interface SessionDurations {
	/** Полная длительность смены: от старта до стопа (или до `now`). */
	totalMs: number;
	/** Непродуктивные паузы — вычитаются из рабочего времени. */
	pauseMs: number;
	/** Продуктивные паузы («вызвали помочь») — остаются в рабочем времени. */
	productivePauseMs: number;
	/** Продуктивное время = totalMs − pauseMs. */
	workMs: number;
}

/** Статус сотрудника в ячейке расписания: ▸ / ⏸ / ■ (или пусто, если смена не начата). */
export type SessionStatus = 'idle' | 'working' | 'paused' | 'stopped';

/**
 * Длительность интервала, обрезанная границами смены.
 * Открытый интервал тянется до конца смены (или до `now`, если смена идёт).
 */
function clampedDurationMs(
	from: Date,
	to: Date | null,
	sessionStart: Date,
	sessionEnd: Date,
): number {
	const start = Math.max(from.getTime(), sessionStart.getTime());
	const end = Math.min((to ?? sessionEnd).getTime(), sessionEnd.getTime());
	return Math.max(0, end - start);
}

export function calculateSessionDurations(
	session: SessionInterval,
	pauses: readonly PauseInterval[],
	now: Date = new Date(),
): SessionDurations {
	const sessionStart = session.startedAt;
	// Незавершённая смена считается «до сейчас», но не раньше собственного старта.
	const sessionEnd =
		session.stoppedAt ?? new Date(Math.max(now.getTime(), sessionStart.getTime()));
	const totalMs = Math.max(0, sessionEnd.getTime() - sessionStart.getTime());

	let pauseMs = 0;
	let productivePauseMs = 0;
	for (const pause of pauses) {
		const duration = clampedDurationMs(pause.startedAt, pause.endedAt, sessionStart, sessionEnd);
		if (pause.isProductive) {
			productivePauseMs += duration;
		} else {
			pauseMs += duration;
		}
	}

	return {
		totalMs,
		pauseMs: Math.min(pauseMs, totalMs),
		productivePauseMs,
		workMs: Math.max(0, totalMs - pauseMs),
	};
}

/** Суммирует длительности нескольких смен — для итогов по сотруднику в админке. */
export function sumDurations(items: readonly SessionDurations[]): SessionDurations {
	return items.reduce<SessionDurations>(
		(acc, item) => ({
			totalMs: acc.totalMs + item.totalMs,
			pauseMs: acc.pauseMs + item.pauseMs,
			productivePauseMs: acc.productivePauseMs + item.productivePauseMs,
			workMs: acc.workMs + item.workMs,
		}),
		{ totalMs: 0, pauseMs: 0, productivePauseMs: 0, workMs: 0 },
	);
}

export function resolveSessionStatus(
	session: SessionInterval | null | undefined,
	pauses: readonly PauseInterval[] = [],
): SessionStatus {
	if (!session) return 'idle';
	if (session.stoppedAt) return 'stopped';
	return pauses.some((p) => p.endedAt === null) ? 'paused' : 'working';
}

/** «3 ч 45 мин» / «10 мин» / «< 1 мин» — для человекочитаемых записей журнала. */
export function formatDurationShort(ms: number): string {
	const totalMinutes = Math.floor(Math.max(0, ms) / 60_000);
	if (totalMinutes < 1) return '< 1 мин';
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours === 0) return `${minutes} мин`;
	if (minutes === 0) return `${hours} ч`;
	return `${hours} ч ${minutes} мин`;
}
