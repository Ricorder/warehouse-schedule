import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { workSessions } from './work-session.schema';

/**
 * Пауза внутри смены. Комментарий обязателен (бизнес-правило ТЗ).
 * isProductive — «продуктивная» пауза вроде «вызвали помочь»:
 * такое время засчитывается в рабочее.
 */
export const pauses = pgTable(
	'pauses',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => workSessions.id, { onDelete: 'cascade' }),
		startedAt: timestamp('started_at').notNull(),
		/** null — пауза ещё не завершена. */
		endedAt: timestamp('ended_at'),
		reason: text('reason').notNull(),
		isProductive: boolean('is_productive').notNull().default(false),
	},
	(table) => [index('pauses_session_idx').on(table.sessionId)],
);

export type SelectPause = typeof pauses.$inferSelect;
export type InsertPause = typeof pauses.$inferInsert;
