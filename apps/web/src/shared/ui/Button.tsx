'use client';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';
import s from './ui.module.scss';

type Variant = 'default' | 'primary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: 'default' | 'small';
	loading?: boolean;
	children: ReactNode;
}

const VARIANT_CLASS: Record<Variant, string | undefined> = {
	default: undefined,
	primary: s.primary,
	danger: s.danger,
	ghost: s.ghost,
};

export function Button({
	variant = 'default',
	size = 'default',
	loading = false,
	disabled,
	className,
	children,
	...rest
}: ButtonProps) {
	const classes = cx(s.button, VARIANT_CLASS[variant], size === 'small' && s.small, className);

	return (
		<button type="button" className={classes} disabled={disabled || loading} {...rest}>
			{loading && <span className={s.spinner} aria-hidden />}
			{children}
		</button>
	);
}
