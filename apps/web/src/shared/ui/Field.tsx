import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { cx } from '../lib/cx';
import s from './ui.module.scss';

export function Field({
	label,
	hint,
	htmlFor,
	children,
}: {
	label: string;
	hint?: string;
	htmlFor?: string;
	children: ReactNode;
}) {
	return (
		<div className={s.field}>
			<label className={s.label} htmlFor={htmlFor}>
				{label}
			</label>
			{children}
			{hint && <span className={s.hint}>{hint}</span>}
		</div>
	);
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} className={cx(s.control, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
	return <select {...props} className={cx(s.control, props.className)} />;
}
