import { Injectable } from '@nestjs/common';
import { formatDurationShort } from '../common/time.util';
import { ActivityLogRepository, type ActivityLogRow } from './activity-log.repository';
import type { ActivityAction, LogList } from './dto/activity-log';

const DEFAULT_LOG_LIMIT = 200;

/** Что можно положить в `details` конкретного действия. */
export interface ActivityDetails {
	reason?: string;
	isProductive?: boolean;
	comment?: string;
	durationMs?: number;
	workMs?: number;
	pauseMs?: number;
	totalMs?: number;
	machineName?: string;
	shiftDate?: string;
	shiftType?: 'day' | 'night';
	startedAtBefore?: string;
	startedAtAfter?: string;
	stoppedAtBefore?: string;
	stoppedAtAfter?: string;
	[key: string]: unknown;
}

export interface LogEntryInput {
	userId: string;
	action: ActivityAction;
	sessionId?: string | null;
	assignmentId?: string | null;
	targetEmployeeId?: string | null;
	details?: ActivityDetails;
}

@Injectable()
export class ActivityLogService {
	constructor(private readonly repository: ActivityLogRepository) {}

	async log(entry: LogEntryInput): Promise<void> {
		await this.repository.create({
			userId: entry.userId,
			action: entry.action,
			sessionId: entry.sessionId ?? null,
			assignmentId: entry.assignmentId ?? null,
			targetEmployeeId: entry.targetEmployeeId ?? null,
			details: entry.details ? JSON.stringify(entry.details) : null,
		});
	}

	async getLogs(filters: { employeeId?: string; from?: string; to?: string; limit?: number }): Promise<LogList> {
		const rows = await this.repository.findMany({
			employeeId: filters.employeeId,
			from: filters.from ? new Date(filters.from) : undefined,
			to: filters.to ? new Date(filters.to) : undefined,
			limit: filters.limit ?? DEFAULT_LOG_LIMIT,
		});
		return rows.map((row) => this.serialize(row));
	}

	async getBySessionId(sessionId: string): Promise<LogList> {
		const rows = await this.repository.findBySessionId(sessionId);
		return rows.map((row) => this.serialize(row));
	}

	async getBySessionIds(sessionIds: string[]): Promise<LogList> {
		const rows = await this.repository.findBySessionIds(sessionIds);
		return rows.map((row) => this.serialize(row));
	}

	private serialize(row: ActivityLogRow): LogList[number] {
		return {
			id: row.id,
			userId: row.userId,
			userName: row.userName,
			targetEmployeeId: row.targetEmployeeId,
			targetEmployeeName: row.targetEmployeeName,
			sessionId: row.sessionId,
			assignmentId: row.assignmentId,
			action: row.action,
			timestamp: row.timestamp.toISOString(),
			details: row.details,
			description: describeAction(row.action, parseDetails(row.details), row.targetEmployeeName),
		};
	}
}

function parseDetails(raw: string | null): ActivityDetails {
	if (!raw) return {};
	try {
		const parsed: unknown = JSON.parse(raw);
		return typeof parsed === 'object' && parsed !== null ? (parsed as ActivityDetails) : {};
	} catch {
		// Записи, у которых details — просто текст, а не JSON.
		return { comment: raw };
	}
}

const SHIFT_LABEL: Record<'day' | 'night', string> = { day: 'день', night: 'ночь' };

/** Человекочитаемое описание записи журнала. */
export function describeAction(
	action: ActivityAction,
	details: ActivityDetails,
	targetName: string | null = null,
): string {
	const target = targetName ? ` — ${targetName}` : '';
	switch (action) {
		case 'start':
			return 'Старт смены';
		case 'pause': {
			const reason = details.reason ?? 'без причины';
			return details.isProductive
				? `Пауза (${reason}) — продуктивная`
				: `Пауза (${reason})`;
		}
		case 'resume': {
			const duration = typeof details.durationMs === 'number' ? ` — ${formatDurationShort(details.durationMs)}` : '';
			return `Возврат к работе${duration}`;
		}
		case 'stop': {
			const work = typeof details.workMs === 'number' ? ` — в работе ${formatDurationShort(details.workMs)}` : '';
			return `Стоп смены${work}`;
		}
		case 'comment':
			return `Комментарий: ${details.comment ?? ''}`;
		case 'admin_edit': {
			const changes: string[] = [];
			if (details.startedAtBefore || details.startedAtAfter) {
				changes.push(`начало ${formatTime(details.startedAtBefore)} → ${formatTime(details.startedAtAfter)}`);
			}
			if (details.stoppedAtBefore || details.stoppedAtAfter) {
				changes.push(`окончание ${formatTime(details.stoppedAtBefore)} → ${formatTime(details.stoppedAtAfter)}`);
			}
			const note = details.comment ? `, причина: ${details.comment}` : '';
			return `Корректировка времени администратором${target}: ${changes.join(', ')}${note}`;
		}
		case 'admin_assign':
			return `Назначение на смену${target}: ${describePlacement(details)}`;
		case 'admin_unassign':
			return `Снятие со смены${target}: ${describePlacement(details)}`;
		default:
			return action;
	}
}

function describePlacement(details: ActivityDetails): string {
	const machine = details.machineName ?? 'станок';
	const shift = details.shiftType ? SHIFT_LABEL[details.shiftType] : '';
	const date = details.shiftDate ?? '';
	return [machine, shift, date].filter(Boolean).join(' / ');
}

/**
 * Время в часовом поясе сервера — тот же пояс, в котором работает склад,
 * поэтому запись журнала совпадает с тем, что видит пользователь в интерфейсе.
 */
function formatTime(iso?: string): string {
	if (!iso) return '—';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
