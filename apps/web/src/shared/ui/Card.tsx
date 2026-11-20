import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import s from './ui.module.scss';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
	return <section className={cx(s.card, className)}>{children}</section>;
}

export function CardHeader({ children }: { children: ReactNode }) {
	return <header className={s.cardHeader}>{children}</header>;
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cx(s.cardBody, className)}>{children}</div>;
}
