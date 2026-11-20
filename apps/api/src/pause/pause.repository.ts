import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { DrizzleDB } from '../configs/db/drizzle';
import { DrizzleAsyncProvider } from '../configs/db/drizzle.provider';
import { type InsertPause, pauses, type SelectPause, shiftAssignments, workSessions } from '../configs/db/schema';

/** Кому принадлежит сессия и завершена ли она — для проверки прав на паузу. */
export interface SessionOwnership {
	sessionId: string;
	employeeId: string;
	stoppedAt: Date | null;
}

@Injectable()
export class PauseRepository {
	constructor(@Inject(DrizzleAsyncProvider) private readonly db: DrizzleDB) {}

	async create(data: InsertPause): Promise<SelectPause> {
		const [pause] = await this.db.insert(pauses).values(data).returning();
		return pause;
	}

	async findById(id: string): Promise<SelectPause | undefined> {
		const [pause] = await this.db.select().from(pauses).where(eq(pauses.id, id)).limit(1);
		return pause;
	}

	async update(id: string, data: Partial<SelectPause>): Promise<SelectPause | undefined> {
		const [pause] = await this.db.update(pauses).set(data).where(eq(pauses.id, id)).returning();
		return pause;
	}

	async findActiveBySession(sessionId: string): Promise<SelectPause | undefined> {
		const [pause] = await this.db
			.select()
			.from(pauses)
			.where(and(eq(pauses.sessionId, sessionId), isNull(pauses.endedAt)))
			.limit(1);
		return pause;
	}

	async findBySessionId(sessionId: string): Promise<SelectPause[]> {
		return this.db.select().from(pauses).where(eq(pauses.sessionId, sessionId)).orderBy(asc(pauses.startedAt));
	}

	/**
	 * Владелец сессии одним запросом (work_sessions → shift_assignments).
	 * Живёт здесь, чтобы модуль пауз не зависел от модуля сессий и не появлялся цикл.
	 */
	async findSessionOwnership(sessionId: string): Promise<SessionOwnership | undefined> {
		const [row] = await this.db
			.select({
				sessionId: workSessions.id,
				employeeId: shiftAssignments.employeeId,
				stoppedAt: workSessions.stoppedAt,
			})
			.from(workSessions)
			.innerJoin(shiftAssignments, eq(shiftAssignments.id, workSessions.assignmentId))
			.where(eq(workSessions.id, sessionId))
			.limit(1);
		return row;
	}
}
