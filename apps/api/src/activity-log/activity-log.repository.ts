import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DrizzleDB } from '../configs/db/drizzle';
import { DrizzleAsyncProvider } from '../configs/db/drizzle.provider';
import { activityLogs, employees, type InsertActivityLog, type SelectActivityLog } from '../configs/db/schema';

/** Запись журнала вместе с именами участников. */
export interface ActivityLogRow extends SelectActivityLog {
	userName: string;
	targetEmployeeName: string | null;
}

@Injectable()
export class ActivityLogRepository {
	constructor(@Inject(DrizzleAsyncProvider) private readonly db: DrizzleDB) {}

	async create(data: InsertActivityLog): Promise<SelectActivityLog> {
		const [log] = await this.db.insert(activityLogs).values(data).returning();
		return log;
	}

	private baseQuery() {
		const actor = alias(employees, 'actor');
		const target = alias(employees, 'target');
		return this.db
			.select({
				id: activityLogs.id,
				userId: activityLogs.userId,
				targetEmployeeId: activityLogs.targetEmployeeId,
				sessionId: activityLogs.sessionId,
				assignmentId: activityLogs.assignmentId,
				action: activityLogs.action,
				timestamp: activityLogs.timestamp,
				details: activityLogs.details,
				userName: actor.name,
				targetEmployeeName: target.name,
			})
			.from(activityLogs)
			.innerJoin(actor, eq(actor.id, activityLogs.userId))
			.leftJoin(target, eq(target.id, activityLogs.targetEmployeeId));
	}

	async findMany(filters: {
		employeeId?: string;
		from?: Date;
		to?: Date;
		limit: number;
	}): Promise<ActivityLogRow[]> {
		const conditions: SQL[] = [];
		if (filters.employeeId) conditions.push(eq(activityLogs.userId, filters.employeeId));
		if (filters.from) conditions.push(gte(activityLogs.timestamp, filters.from));
		if (filters.to) conditions.push(lte(activityLogs.timestamp, filters.to));

		const query = this.baseQuery();
		const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
		return filtered.orderBy(desc(activityLogs.timestamp)).limit(filters.limit);
	}

	async findBySessionId(sessionId: string): Promise<ActivityLogRow[]> {
		return this.baseQuery().where(eq(activityLogs.sessionId, sessionId)).orderBy(activityLogs.timestamp);
	}

	async findBySessionIds(sessionIds: string[]): Promise<ActivityLogRow[]> {
		if (sessionIds.length === 0) return [];
		return this.baseQuery()
			.where(inArray(activityLogs.sessionId, sessionIds))
			.orderBy(activityLogs.timestamp);
	}
}
