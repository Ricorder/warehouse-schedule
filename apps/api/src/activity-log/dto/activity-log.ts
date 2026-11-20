import { z } from 'zod';

export const activityAction = z.enum([
	'start',
	'pause',
	'resume',
	'stop',
	'comment',
	'admin_edit',
	'admin_assign',
	'admin_unassign',
]);

export const logEntry = z.object({
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
	/** Сырые детали в виде JSON-строки. */
	details: z.string().nullable(),
	/** Человекочитаемое описание, собранное на сервере. */
	description: z.string(),
});

export const logList = z.array(logEntry);

export const getLogsInput = z.object({
	employeeId: z.uuid().optional(),
	from: z.string().optional(),
	to: z.string().optional(),
	limit: z.number().int().min(1).max(500).optional(),
});

export const getSessionLogsInput = z.object({
	sessionId: z.uuid(),
});

export const addCommentInput = z.object({
	sessionId: z.uuid(),
	comment: z.string().min(1, 'Комментарий не может быть пустым').max(500),
});

export type ActivityAction = z.infer<typeof activityAction>;
export type LogEntry = z.infer<typeof logEntry>;
export type LogList = z.infer<typeof logList>;
export type GetLogsInput = z.infer<typeof getLogsInput>;
export type GetSessionLogsInput = z.infer<typeof getSessionLogsInput>;
export type AddCommentInput = z.infer<typeof addCommentInput>;
