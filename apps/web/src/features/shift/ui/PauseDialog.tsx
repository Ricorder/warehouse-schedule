'use client';
import { type FormEvent, useState } from 'react';
import { usePausePresets, useStartPause } from '@/entities';
import { Button, cx, ErrorMessage, Field, Input, Modal } from '@/shared';
import s from './shift.module.scss';

/** ТЗ: «Сотрудник может поставить себя на паузу только с комментарием». */
export function PauseDialog({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
	const { data: presets = [] } = usePausePresets();
	const startPause = useStartPause();
	const [reason, setReason] = useState('');
	const [isProductive, setIsProductive] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const activePreset = presets.find((preset) => preset.reason === reason);
	const isCustomReason = reason.length > 0 && !activePreset;

	const selectPreset = (presetReason: string, presetProductive: boolean) => {
		setReason(presetReason);
		setIsProductive(presetProductive);
	};

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (!reason.trim()) {
			setError('Укажите причину паузы');
			return;
		}
		setError(null);
		try {
			await startPause.mutateAsync({ sessionId, reason: reason.trim(), isProductive });
			onClose();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось поставить паузу');
		}
	};

	return (
		<Modal title="Пауза" onClose={onClose}>
			<form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
				<Field label="Причина">
					<div className={s.reasonList}>
						{presets.map((preset) => (
							<button
								key={preset.reason}
								type="button"
								className={cx(s.reasonChip, activePreset?.reason === preset.reason && s.reasonChipActive)}
								onClick={() => selectPreset(preset.reason, preset.isProductive)}
							>
								{preset.reason}
							</button>
						))}
					</div>
				</Field>

				<Field label="Или своя причина" htmlFor="pause-reason">
					<Input
						id="pause-reason"
						value={reason}
						placeholder="Например: помогал на приёмке"
						onChange={(event) => setReason(event.target.value)}
						autoFocus
					/>
				</Field>

				{isCustomReason && (
					<label className={s.checkboxRow}>
						<input
							type="checkbox"
							checked={isProductive}
							onChange={(event) => setIsProductive(event.target.checked)}
						/>
						Продуктивная пауза — время засчитать в рабочее
					</label>
				)}

				<div className={s.productiveNote}>
					{isProductive
						? '✅ Это время войдёт в продуктивное — как «вызвали помочь» в ТЗ.'
						: '⏸ Это время будет вычтено из продуктивного.'}
				</div>

				{error && <ErrorMessage>{error}</ErrorMessage>}

				<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
					<Button variant="ghost" onClick={onClose}>
						Отмена
					</Button>
					<Button type="submit" variant="primary" loading={startPause.isPending}>
						Поставить на паузу
					</Button>
				</div>
			</form>
		</Modal>
	);
}
