import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import s from './ui.module.scss';

export function ErrorMessage({ children }: { children: ReactNode }) {
	return (
		<div className={cx(s.alert, s.alertError)} role="alert">
			{children}
		</div>
	);
}

export function InfoMessage({ children }: { children: ReactNode }) {
	return <div className={cx(s.alert, s.alertInfo)}>{children}</div>;
}

export function Loading({ label = 'Загрузка…' }: { label?: string }) {
	return (
		<div className={s.centered}>
			<span className={s.spinner} aria-hidden />
			{label}
		</div>
	);
}

export function EmptyState({ children }: { children: ReactNode }) {
	return <div className={s.empty}>{children}</div>;
}
