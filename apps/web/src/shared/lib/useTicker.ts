'use client';
import { useEffect, useState } from 'react';

/**
 * Возвращает метку времени, обновляемую раз в `intervalMs`.
 * Нужен, чтобы таймер смены шёл секунда в секунду, а не только при рефетче.
 */
export function useTicker(intervalMs = 1000, enabled = true): number {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (!enabled) return;
		const id = window.setInterval(() => setNow(Date.now()), intervalMs);
		return () => window.clearInterval(id);
	}, [intervalMs, enabled]);

	return now;
}
