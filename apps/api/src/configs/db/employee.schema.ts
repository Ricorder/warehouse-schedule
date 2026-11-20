import { index, pgEnum, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

export const employeeRoleEnum = pgEnum('employee_role', ['admin', 'worker']);

/** Сотрудники склада: и администраторы, и сборщики/фасовщики. */
export const employees = pgTable(
	'employees',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 255 }).notNull(),
		email: varchar('email', { length: 255 }).notNull().unique(),
		password: varchar('password', { length: 255 }).notNull(),
		role: employeeRoleEnum('role').notNull().default('worker'),
	},
	(table) => [index('employees_name_idx').on(table.name)],
);

export type SelectEmployee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;
