'use client';
import { useMemo, useState } from 'react';
import { useEndPause, useStopSession } from '@/entities';
import { CommentDialog, PauseDialog, StartShiftForm } from '@/features';
import {
	Button,
	calculateDurations,
	cx,
	Card,
	CardBody,
	CardHeader,
	EmptyState,
	ErrorMessage,
	formatDate,
	formatDuration,
	formatDurationWithSeconds,
	formatTime,
	machineTypeLabel,
	shiftLabel,
	useTicker,
} from '@/shared';
import type { CurrentShift, SessionStatus } from '@/shared';
import s from './ShiftTimer.module.scss';

const STATUS_VIEW: Record<SessionStatus, { icon: string; label: string; className?: string }> = {
	working: { icon: '▸', label: 'В работе', className: s.statusWorking },
	paused: { icon: '⏸', label: 'На паузе', className: s.statusPaused },
	stopped: { icon: '■', label: 'Смена завершена', className: s.statusStopped },
	idle: { icon: '○', label: 'Смена не начата', className: s.statusIdle },
};

interface ShiftTimerProps {
	shift: CurrentShift | null;
	/** Время сервера на момент загрузки — компенсирует расхождение часов клиента. */
	clockSkewMs: number;
	defaultShiftType: 'day' | 'night';
}

export function ShiftTimer({ shift, clockSkewMs, defaultShiftType }: ShiftTimerProps) {
	const [dialog, setDialog] = useState<'pause' | 'comment' | null>(null);
	const [error, setError] = useState<string | null>(null);
	const endPause = useEndPause();
	const stopSession = useStopSession();

	const isLive = shift?.status === 'working' || shift?.status === 'paused';
	const tick = useTicker(1000, isLive);
	const nowMs = tick + clockSkewMs;

	const durations = useMemo(
		() => calculateDurations(shift?.session ?? null, shift?.pauses ?? [], nowMs),
		[shift?.session, shift?.pauses, nowMs],
	);

	const lastComment = useMemo(() => {
		const comments = (shift?.logs ?? []).filter((log) => log.action === 'comment');
		const last = comments[comments.length - 1];
		if (!last) return null;
		try {
			return (JSON.parse(last.details ?? '{}') as { comment?: string }).comment ?? null;
		} catch {
			return last.details;
		}
	}, [shift?.logs]);

	if (!shift) {
		return (
			<Card>
				<CardHeader>
					<h1>Начало смены</h1>
				</CardHeader>
				<CardBody>
					<p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
						На сегодня назначения нет. Выберите рабочее место и смену, чтобы начать работу.
					</p>
					<StartShiftForm defaultShift={defaultShiftType} />
				</CardBody>
			</Card>
		);
	}

	const status = STATUS_VIEW[shift.status];
	const { assignment, session, activePause } = shift;

	const handleResume = async () => {
		if (!activePause) return;
		setError(null);
		try {
			await endPause.mutateAsync({ pauseId: activePause.id });
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось вернуться к работе');
		}
	};

	const handleStop = async () => {
		if (!session) return;
		setError(null);
		try {
			await stopSession.mutateAsync({ sessionId: session.id });
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось завершить смену');
		}
	};

	return (
		<>
			<Card>
				<CardHeader>
					<h1>Моя смена</h1>
					<div className={s.statusRow}>
						<span className={cx(s.statusBadge, status.className)}>
							{status.icon} {status.label}
						</span>
					</div>
				</CardHeader>

				<CardBody>
					<div className={s.summary}>
						<div className={s.summaryItem}>
							<span className={s.summaryLabel}>👤 Сотрудник</span>
							<span className={s.summaryValue}>{shift.employee.name}</span>
						</div>
						<div className={s.summaryItem}>
							<span className={s.summaryLabel}>📅 Дата</span>
							<span className={s.summaryValue}>{formatDate(assignment.shiftDate)}</span>
						</div>
						<div className={s.summaryItem}>
							<span className={s.summaryLabel}>🏷 Смена</span>
							<span className={s.summaryValue}>{shiftLabel(assignment.shiftType)}</span>
						</div>
						<div className={s.summaryItem}>
							<span className={s.summaryLabel}>
								🛠 {machineTypeLabel(assignment.machineType)}
							</span>
							<span className={s.summaryValue}>
								{assignment.machineName} / {shiftLabel(assignment.shiftType)}
							</span>
						</div>
					</div>

					{session ? (
						<>
							<div className={s.timers}>
								<div className={s.timer}>
									<div className={s.timerLabel}>⏱ Время в работе</div>
									<div className={cx(s.timerValue, s.timerAccent)}>
										{isLive
											? formatDurationWithSeconds(durations.workMs)
											: formatDuration(durations.workMs)}
									</div>
								</div>
								<div className={s.timer}>
									<div className={s.timerLabel}>⏱ Время пауз</div>
									<div className={s.timerValue}>{formatDuration(durations.pauseMs)}</div>
								</div>
								<div className={s.timer}>
									<div className={s.timerLabel}>⏱ Итого</div>
									<div className={s.timerValue}>{formatDuration(durations.totalMs)}</div>
								</div>
							</div>

							{durations.productivePauseMs > 0 && (
								<p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)' }}>
									Из них продуктивных пауз ({formatDuration(durations.productivePauseMs)}) —
									засчитаны в рабочее время.
								</p>
							)}

							{activePause && (
								<div className={s.pauseBanner}>
									<span>
										⏸ Пауза «{activePause.reason}» с {formatTime(activePause.startedAt)}
										{activePause.isProductive && ' · продуктивная'}
									</span>
									<Button size="small" onClick={handleResume} loading={endPause.isPending}>
										▶ Вернуться к работе
									</Button>
								</div>
							)}

							{error && (
								<div style={{ marginTop: 12 }}>
									<ErrorMessage>{error}</ErrorMessage>
								</div>
							)}

							<div className={s.controls}>
								<Button disabled>▶ Старт смены {formatTime(session.startedAt)}</Button>
								<Button
									variant="primary"
									disabled={shift.status !== 'working'}
									onClick={() => setDialog('pause')}
								>
									⏸ Пауза
								</Button>
								<Button
									variant="danger"
									disabled={shift.status === 'stopped'}
									loading={stopSession.isPending}
									onClick={handleStop}
								>
									■ Стоп смены
								</Button>
								<Button variant="ghost" onClick={() => setDialog('comment')}>
									+ Добавить комментарий
								</Button>
							</div>
						</>
					) : (
						<>
							<p style={{ color: 'var(--text-muted)' }}>
								Вы назначены на {assignment.machineName} ({shiftLabel(assignment.shiftType)}), но
								смена ещё не начата.
							</p>
							<StartShiftForm defaultShift={assignment.shiftType} />
						</>
					)}
				</CardBody>
			</Card>

			<Card>
				<CardHeader>
					<h2>История действий</h2>
				</CardHeader>
				<CardBody>
					{shift.logs.length === 0 ? (
						<EmptyState>Записей пока нет</EmptyState>
					) : (
						<ul className={s.history}>
							{shift.logs.map((log) => (
								<li key={log.id} className={s.historyItem}>
									<span className={s.historyTime}>{formatTime(log.timestamp)}</span>
									<span>{log.description}</span>
								</li>
							))}
						</ul>
					)}

					{lastComment && (
						<div className={s.lastComment}>
							<span>📌 Последний комментарий:</span>
							<span className={s.commentText}>«{lastComment}»</span>
						</div>
					)}
				</CardBody>
			</Card>

			{dialog === 'pause' && session && (
				<PauseDialog sessionId={session.id} onClose={() => setDialog(null)} />
			)}
			{dialog === 'comment' && session && (
				<CommentDialog sessionId={session.id} onClose={() => setDialog(null)} />
			)}
		</>
	);
}
