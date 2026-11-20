import { index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { shiftAssignments } from './shift-assignment.schema';

/** Фактическая работа по назначению: старт и стоп смены. */
export const workSessions = pgTable(
	'work_sessions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		assignmentId: uuid('assignment_id')
			.notNull()
			.references(() => shiftAssignments.id, { onDelete: 'cascade' }),
		startedAt: timestamp('started_at').notNull(),
		/** null — смена ещё идёт. */
		stoppedAt: timestamp('stopped_at'),
	},
	(table) => [index('work_sessions_assignment_idx').on(table.assignmentId)],
);

export type SelectWorkSession = typeof workSessions.$inferSelect;
export type InsertWorkSession = typeof workSessions.$inferInsert;
