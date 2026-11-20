import { z } from 'zod';

export const startSessionInput = z.object({
	machineId: z.uuid(),
	shiftType: z.enum(['day', 'night']),
	/** По умолчанию — сегодня. */
	shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const stopSessionInput = z.object({
	sessionId: z.uuid(),
});

export const addCommentInput = z.object({
	sessionId: z.uuid(),
	comment: z.string().min(1, 'Комментарий не может быть пустым').max(500),
});

export const adjustSessionInput = z.object({
	sessionId: z.uuid(),
	/** ISO-время начала смены. */
	startedAt: z.string(),
	/** ISO-время окончания; null — смена снова считается активной. */
	stoppedAt: z.string().nullable(),
	/** Причина корректировки — попадёт в журнал. */
	comment: z.string().max(500).optional(),
});

export const sessionOutput = z.object({
	id: z.uuid(),
	assignmentId: z.uuid(),
	startedAt: z.string(),
	stoppedAt: z.string().nullable(),
});

export const durationsOutput = z.object({
	workMs: z.number(),
	pauseMs: z.number(),
	productivePauseMs: z.number(),
	totalMs: z.number(),
});

/** Полное состояние текущей смены для экрана сотрудника. */
export const currentShiftOutput = z.object({
	employee: z.object({
		id: z.uuid(),
		name: z.string(),
	}),
	assignment: z.object({
		id: z.uuid(),
		shiftDate: z.string(),
		shiftType: z.enum(['day', 'night']),
		machineId: z.uuid(),
		machineName: z.string(),
		machineType: z.enum(['machine', 'table']),
	}),
	session: z
		.object({
			id: z.uuid(),
			assignmentId: z.uuid(),
			startedAt: z.string(),
			stoppedAt: z.string().nullable(),
		})
		.nullable(),
	status: z.enum(['idle', 'working', 'paused', 'stopped']),
	pauses: z.array(
		z.object({
			id: z.uuid(),
			sessionId: z.uuid(),
			startedAt: z.string(),
			endedAt: z.string().nullable(),
			reason: z.string(),
			isProductive: z.boolean(),
		}),
	),
	activePause: z
		.object({
			id: z.uuid(),
			sessionId: z.uuid(),
			startedAt: z.string(),
			endedAt: z.string().nullable(),
			reason: z.string(),
			isProductive: z.boolean(),
		})
		.nullable(),
	logs: z.array(
		z.object({
			id: z.uuid(),
			userId: z.uuid(),
			userName: z.string(),
			targetEmployeeId: z.uuid().nullable(),
			targetEmployeeName: z.string().nullable(),
			sessionId: z.uuid().nullable(),
			assignmentId: z.uuid().nullable(),
			action: z.enum([
				'start',
				'pause',
				'resume',
				'stop',
				'comment',
				'admin_edit',
				'admin_assign',
				'admin_unassign',
			]),
			timestamp: z.string(),
			details: z.string().nullable(),
			description: z.string(),
		}),
	),
	durations: z.object({
		workMs: z.number(),
		pauseMs: z.number(),
		productivePauseMs: z.number(),
		totalMs: z.number(),
	}),
	/** Время сервера — чтобы таймер на клиенте не расходился из-за часов пользователя. */
	serverTime: z.string(),
});

export const getHistoryInput = z.object({
	from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** История смен сотрудника — только для просмотра (бизнес-правило ТЗ). */
export const historyOutput = z.object({
	items: z.array(
		z.object({
			assignmentId: z.uuid(),
			employeeId: z.uuid(),
			employeeName: z.string(),
			sessionId: z.uuid().nullable(),
			sessionStartedAt: z.string().nullable(),
			sessionStoppedAt: z.string().nullable(),
			status: z.enum(['idle', 'working', 'paused', 'stopped']),
			workMs: z.number(),
			pauseMs: z.number(),
			totalMs: z.number(),
			shiftDate: z.string(),
			shiftType: z.enum(['day', 'night']),
			machineName: z.string(),
			machineType: z.enum(['machine', 'table']),
		}),
	),
	summary: z.object({
		workMs: z.number(),
		pauseMs: z.number(),
		totalMs: z.number(),
	}),
});

export type StartSessionInput = z.infer<typeof startSessionInput>;
export type StopSessionInput = z.infer<typeof stopSessionInput>;
export type AddCommentInput = z.infer<typeof addCommentInput>;
export type AdjustSessionInput = z.infer<typeof adjustSessionInput>;
export type SessionOutput = z.infer<typeof sessionOutput>;
export type DurationsOutput = z.infer<typeof durationsOutput>;
export type CurrentShiftOutput = z.infer<typeof currentShiftOutput>;
export type GetHistoryInput = z.infer<typeof getHistoryInput>;
export type HistoryOutput = z.infer<typeof historyOutput>;
