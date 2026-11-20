import { pgEnum, pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core';

/** Рабочее место: станок либо стол (ТЗ разделяет их в переключателе «Станки | Столы»). */
export const machineTypeEnum = pgEnum('machine_type', ['machine', 'table']);

export const machines = pgTable(
	'machines',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 255 }).notNull(),
		type: machineTypeEnum('type').notNull(),
	},
	(table) => [unique('machines_name_type_unique').on(table.name, table.type)],
);

export type SelectMachine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;
