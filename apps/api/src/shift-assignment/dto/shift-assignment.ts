import { z } from 'zod';

export const shiftType = z.enum(['day', 'night']);
export const sessionStatus = z.enum(['idle', 'working', 'paused', 'stopped']);

export const assignEmployeeInput = z.object({
	employeeId: z.uuid(),
	machineId: z.uuid(),
	shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	shiftType: z.enum(['day', 'night']),
});

export const unassignEmployeeInput = z.object({
	assignmentId: z.uuid(),
});

export const getScheduleInput = z.object({
	from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	/** Фильтр по смене; не задан — показываем и день, и ночь. */
	shiftType: z.enum(['day', 'night']).optional(),
	/** Переключатель «Станки | Столы». */
	machineType: z.enum(['machine', 'table']).optional(),
	/** Фильтр по фамилии сотрудника. */
	search: z.string().optional(),
	/** «Только занятые» — скрыть строки без назначений. */
	onlyBusy: z.boolean().optional(),
});

export const assignmentOutput = z.object({
	id: z.uuid(),
	employeeId: z.uuid(),
	machineId: z.uuid(),
	shiftDate: z.string(),
	shiftType: z.enum(['day', 'night']),
	createdAt: z.string(),
});

/** Один сотрудник в ячейке «станок × смена × дата». */
export const scheduleEntry = z.object({
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
});

export const scheduleRow = z.object({
	machineId: z.uuid(),
	machineName: z.string(),
	machineType: z.enum(['machine', 'table']),
	shiftType: z.enum(['day', 'night']),
	cells: z.array(
		z.object({
			date: z.string(),
			entries: z.array(
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
				}),
			),
		}),
	),
});

/** Итоговое время сотрудника за показанный период (ТЗ: «подсчет общего времени работы»). */
export const employeeTotal = z.object({
	employeeId: z.uuid(),
	employeeName: z.string(),
	workMs: z.number(),
	pauseMs: z.number(),
	totalMs: z.number(),
	shiftsCount: z.number(),
});

export const scheduleOutput = z.object({
	dates: z.array(z.string()),
	rows: z.array(
		z.object({
			machineId: z.uuid(),
			machineName: z.string(),
			machineType: z.enum(['machine', 'table']),
			shiftType: z.enum(['day', 'night']),
			cells: z.array(
				z.object({
					date: z.string(),
					entries: z.array(
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
						}),
					),
				}),
			),
		}),
	),
	totals: z.array(
		z.object({
			employeeId: z.uuid(),
			employeeName: z.string(),
			workMs: z.number(),
			pauseMs: z.number(),
			totalMs: z.number(),
			shiftsCount: z.number(),
		}),
	),
	maxPerMachine: z.number(),
});

export type ShiftType = z.infer<typeof shiftType>;
export type SessionStatusDto = z.infer<typeof sessionStatus>;
export type AssignEmployeeInput = z.infer<typeof assignEmployeeInput>;
export type UnassignEmployeeInput = z.infer<typeof unassignEmployeeInput>;
export type GetScheduleInput = z.infer<typeof getScheduleInput>;
export type AssignmentOutput = z.infer<typeof assignmentOutput>;
export type ScheduleEntry = z.infer<typeof scheduleEntry>;
export type ScheduleRow = z.infer<typeof scheduleRow>;
export type EmployeeTotal = z.infer<typeof employeeTotal>;
export type ScheduleOutput = z.infer<typeof scheduleOutput>;
