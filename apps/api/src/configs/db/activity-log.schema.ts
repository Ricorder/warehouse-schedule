import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { employees } from './employee.schema';
import { shiftAssignments } from './shift-assignment.schema';
import { workSessions } from './work-session.schema';

export const activityActionEnum = pgEnum('activity_action', [
	'start',
	'pause',
	'resume',
	'stop',
	'comment',
	'admin_edit',
	'admin_assign',
	'admin_unassign',
]);

/**
 * Журнал действий (ТЗ: «все действия сотрудников и администраторов фиксируются»).
 * sessionId/assignmentId необязательны: админские назначения происходят
 * до появления сессии, а комментарии и паузы — уже внутри неё.
 */
export const activityLogs = pgTable(
	'activity_logs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		/** Кто совершил действие. */
		userId: uuid('user_id')
			.notNull()
			.references(() => employees.id, { onDelete: 'cascade' }),
		/** Над кем совершено — для админских действий отличается от userId. */
		targetEmployeeId: uuid('target_employee_id').references(() => employees.id, { onDelete: 'cascade' }),
		sessionId: uuid('session_id').references(() => workSessions.id, { onDelete: 'cascade' }),
		assignmentId: uuid('assignment_id').references(() => shiftAssignments.id, { onDelete: 'cascade' }),
		action: activityActionEnum('action').notNull(),
		timestamp: timestamp('timestamp').notNull().defaultNow(),
		/** JSON-строка с деталями действия: причина паузы, старое/новое время и т.п. */
		details: text('details'),
	},
	(table) => [
		index('activity_logs_session_idx').on(table.sessionId),
		index('activity_logs_user_idx').on(table.userId),
		index('activity_logs_timestamp_idx').on(table.timestamp),
	],
);

export type SelectActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
