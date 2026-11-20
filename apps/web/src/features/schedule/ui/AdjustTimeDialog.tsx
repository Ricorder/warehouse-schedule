'use client';
import { type FormEvent, useState } from 'react';
import { useAdjustSession } from '@/entities';
import { Button, ErrorMessage, Field, InfoMessage, Input, Modal, toDateTimeLocal } from '@/shared';

interface AdjustTimeDialogProps {
	sessionId: string;
	employeeName: string;
	startedAt: string;
	stoppedAt: string | null;
	onClose: () => void;
}

/**
 * ТЗ: «Администратор может скорректировать время работы сотрудника
 * с сохранением информации об этих действиях».
 */
export function AdjustTimeDialog({
	sessionId,
	employeeName,
	startedAt,
	stoppedAt,
	onClose,
}: AdjustTimeDialogProps) {
	const adjust = useAdjustSession();
	const [start, setStart] = useState(() => toDateTimeLocal(startedAt));
	const [stop, setStop] = useState(() => toDateTimeLocal(stoppedAt));
	const [comment, setComment] = useState('');
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (!start) {
			setError('Укажите время начала смены');
			return;
		}
		setError(null);
		try {
			await adjust.mutateAsync({
				sessionId,
				startedAt: new Date(start).toISOString(),
				stoppedAt: stop ? new Date(stop).toISOString() : null,
				comment: comment.trim() || undefined,
			});
			onClose();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось сохранить изменения');
		}
	};

	return (
		<Modal title={`Корректировка времени — ${employeeName}`} onClose={onClose}>
			<form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
				<Field label="Начало смены" htmlFor="adjust-start">
					<Input
						id="adjust-start"
						type="datetime-local"
						value={start}
						onChange={(event) => setStart(event.target.value)}
						required
					/>
				</Field>

				<Field label="Окончание смены" hint="Пусто — смена снова считается активной" htmlFor="adjust-stop">
					<Input
						id="adjust-stop"
						type="datetime-local"
						value={stop}
						onChange={(event) => setStop(event.target.value)}
					/>
				</Field>

				<Field label="Причина корректировки" htmlFor="adjust-comment">
					<Input
						id="adjust-comment"
						value={comment}
						maxLength={500}
						placeholder="Например: сотрудник забыл нажать «Старт»"
						onChange={(event) => setComment(event.target.value)}
					/>
				</Field>

				<InfoMessage>Изменение будет записано в журнал действий вместе со старыми значениями.</InfoMessage>
				{error && <ErrorMessage>{error}</ErrorMessage>}

				<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
					<Button variant="ghost" onClick={onClose}>
						Отмена
					</Button>
					<Button type="submit" variant="primary" loading={adjust.isPending}>
						Сохранить
					</Button>
				</div>
			</form>
		</Modal>
	);
}
