/**
 * Клиентский расчёт времени смены — зеркало серверной логики
 * (`apps/api/src/common/time.util.ts`), чтобы таймер шёл каждую секунду,
 * не дожидаясь ответа сервера.
 */
export interface PauseLike {
	startedAt: string;
	endedAt: string | null;
	isProductive: boolean;
}

export interface SessionLike {
	startedAt: string;
	stoppedAt: string | null;
}

export interface Durations {
	totalMs: number;
	pauseMs: number;
	productivePauseMs: number;
	workMs: number;
}

const ZERO: Durations = { totalMs: 0, pauseMs: 0, productivePauseMs: 0, workMs: 0 };

export function calculateDurations(
	session: SessionLike | null,
	pauses: readonly PauseLike[],
	nowMs: number,
): Durations {
	if (!session) return ZERO;

	const startMs = Date.parse(session.startedAt);
	const endMs = session.stoppedAt ? Date.parse(session.stoppedAt) : Math.max(nowMs, startMs);
	const totalMs = Math.max(0, endMs - startMs);

	let pauseMs = 0;
	let productivePauseMs = 0;
	for (const pause of pauses) {
		const from = Math.max(Date.parse(pause.startedAt), startMs);
		const to = Math.min(pause.endedAt ? Date.parse(pause.endedAt) : endMs, endMs);
		const duration = Math.max(0, to - from);
		if (pause.isProductive) productivePauseMs += duration;
		else pauseMs += duration;
	}

	return {
		totalMs,
		pauseMs: Math.min(pauseMs, totalMs),
		productivePauseMs,
		workMs: Math.max(0, totalMs - pauseMs),
	};
}
