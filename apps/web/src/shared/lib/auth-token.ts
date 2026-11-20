'use client';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'schedule.accessToken';

/**
 * Единственное место хранения access-токена.
 * И tRPC-клиент, и React-компоненты читают его отсюда, поэтому после входа
 * заголовок Authorization появляется сразу, без перезагрузки страницы.
 */
let token: string | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate(): void {
	if (hydrated || typeof window === 'undefined') return;
	token = window.localStorage.getItem(STORAGE_KEY);
	hydrated = true;
}

export function getAccessToken(): string | null {
	hydrate();
	return token;
}

export function setAccessToken(next: string | null): void {
	hydrated = true;
	token = next;
	if (typeof window !== 'undefined') {
		if (next) window.localStorage.setItem(STORAGE_KEY, next);
		else window.localStorage.removeItem(STORAGE_KEY);
	}
	listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Реактивная подписка на токен.
 *
 * `undefined` — состояние ещё не прочитано (серверный рендер и первый
 * гидратационный рендер). Отличать его от `null` обязательно: иначе гварды
 * успевают отправить пользователя на страницу входа до чтения localStorage,
 * и любая перезагрузка страницы выглядит как разлогин.
 */
export function useAccessToken(): string | null | undefined {
	return useSyncExternalStore(
		subscribe,
		() => getAccessToken(),
		() => undefined,
	);
}
