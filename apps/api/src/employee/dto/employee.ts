import { z } from 'zod';

export const employeeOutput = z.object({
	id: z.uuid(),
	name: z.string(),
	email: z.email(),
	role: z.enum(['admin', 'worker']),
});

export const employeeList = z.array(employeeOutput);

export const getEmployeesInput = z.object({
	role: z.enum(['admin', 'worker']).optional(),
	/** Поиск по фамилии/имени (подстрока, регистронезависимо). */
	search: z.string().optional(),
});

/** Сотрудник в выпадающем списке назначения: занятые подсвечиваются жёлтым. */
export const assignableEmployee = z.object({
	id: z.uuid(),
	name: z.string(),
	role: z.enum(['admin', 'worker']),
	/** Уже назначен на какой-то станок в эту дату и смену. */
	busy: z.boolean(),
	busyMachineId: z.uuid().nullable(),
	busyMachineName: z.string().nullable(),
});

export const assignableEmployeeList = z.array(assignableEmployee);

export const getAssignableInput = z.object({
	shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	shiftType: z.enum(['day', 'night']),
	search: z.string().optional(),
});

/** Ручное добавление сотрудника из админки (пункт «Новый...» в ТЗ). */
export const createEmployeeInput = z.object({
	name: z.string().min(3, 'Укажите имя и фамилию').max(255),
	email: z.email(),
	password: z.string().min(8).max(100),
	role: z.enum(['admin', 'worker']).optional(),
});

export type EmployeeOutput = z.infer<typeof employeeOutput>;
export type EmployeeList = z.infer<typeof employeeList>;
export type GetEmployeesInput = z.infer<typeof getEmployeesInput>;
export type AssignableEmployee = z.infer<typeof assignableEmployee>;
export type AssignableEmployeeList = z.infer<typeof assignableEmployeeList>;
export type GetAssignableInput = z.infer<typeof getAssignableInput>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeInput>;
