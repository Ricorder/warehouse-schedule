'use client';
import { type ReactNode, useEffect } from 'react';
import { Button } from './Button';
import s from './ui.module.scss';

interface ModalProps {
	title: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
}

export function Modal({ title, onClose, children, footer }: ModalProps) {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [onClose]);

	return (
		<div className={s.overlay} role="presentation" onClick={onClose}>
			<div
				className={s.modal}
				role="dialog"
				aria-modal="true"
				aria-label={title}
				onClick={(event) => event.stopPropagation()}
			>
				<div className={s.modalHeader}>
					<h2>{title}</h2>
					<Button variant="ghost" size="small" onClick={onClose} aria-label="Закрыть">
						✕
					</Button>
				</div>
				{children}
				{footer && <div className={s.modalActions}>{footer}</div>}
			</div>
		</div>
	);
}
