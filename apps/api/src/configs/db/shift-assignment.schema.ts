import { relations } from 'drizzle-orm';
import { date, index, pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { employees } from './employee.schema';
import { machines } from './machine.schema';

export const shiftTypeEnum = pgEnum('shift_type', ['day', 'night']);

/**
 * Назначение сотрудника на станок в конкретную смену.
 * Уникальность (employee, date, shift) реализует правило ТЗ
 * «нельзя назначить сотрудника на два станка в одну смену».
 */
export const shiftAssignments = pgTable(
	'shift_assignments',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		employeeId: uuid('employee_id')
			.notNull()
			.references(() => employees.id, { onDelete: 'cascade' }),
		machineId: uuid('machine_id')
			.notNull()
			.references(() => machines.id, { onDelete: 'cascade' }),
		shiftDate: date('shift_date').notNull(),
		shiftType: shiftTypeEnum('shift_type').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => [
		unique('shift_assignments_employee_shift_unique').on(table.employeeId, table.shiftDate, table.shiftType),
		index('shift_assignments_machine_shift_idx').on(table.machineId, table.shiftDate, table.shiftType),
		index('shift_assignments_date_idx').on(table.shiftDate),
	],
);

export const shiftAssignmentsRelations = relations(shiftAssignments, ({ one }) => ({
	employee: one(employees, {
		fields: [shiftAssignments.employeeId],
		references: [employees.id],
	}),
	machine: one(machines, {
		fields: [shiftAssignments.machineId],
		references: [machines.id],
	}),
}));

export type SelectShiftAssignment = typeof shiftAssignments.$inferSelect;
export type InsertShiftAssignment = typeof shiftAssignments.$inferInsert;
