import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import type { DrizzleDB } from '../configs/db/drizzle';
import { DrizzleAsyncProvider } from '../configs/db/drizzle.provider';
import {
	employees,
	type InsertWorkSession,
	machines,
	type SelectWorkSession,
	shiftAssignments,
	workSessions,
} from '../configs/db/schema';

/** Сессия вместе с контекстом смены — всё, что нужно экрану сотрудника. */
export interface SessionContext {
	session: SelectWorkSession | null;
	assignmentId: string;
	shiftDate: string;
	shiftType: 'day' | 'night';
	machineId: string;
	machineName: string;
	machineType: 'machine' | 'table';
	employeeId: string;
	employeeName: string;
}

@Injectable()
export class WorkSessionRepository {
	constructor(@Inject(DrizzleAsyncProvider) private readonly db: DrizzleDB) {}

	async create(data: InsertWorkSession): Promise<SelectWorkSession> {
		const [session] = await this.db.insert(workSessions).values(data).returning();
		return session;
	}

	async findById(id: string): Promise<SelectWorkSession | undefined> {
		const [session] = await this.db.select().from(workSessions).where(eq(workSessions.id, id)).limit(1);
		return session;
	}

	async update(id: string, data: Partial<SelectWorkSession>): Promise<SelectWorkSession | undefined> {
		const [session] = await this.db.update(workSessions).set(data).where(eq(workSessions.id, id)).returning();
		return session;
	}

	async findActiveByAssignment(assignmentId: string): Promise<SelectWorkSession | undefined> {
		const [session] = await this.db
			.select()
			.from(workSessions)
			.where(and(eq(workSessions.assignmentId, assignmentId), isNull(workSessions.stoppedAt)))
			.limit(1);
		return session;
	}

	private contextColumns() {
		return {
			session: workSessions,
			assignmentId: shiftAssignments.id,
			shiftDate: shiftAssignments.shiftDate,
			shiftType: shiftAssignments.shiftType,
			machineId: machines.id,
			machineName: machines.name,
			machineType: machines.type,
			employeeId: employees.id,
			employeeName: employees.name,
		};
	}

	/** Активная (незавершённая) смена сотрудника — независимо от даты. */
	async findActiveContextByEmployee(employeeId: string): Promise<SessionContext | undefined> {
		const [row] = await this.db
			.select(this.contextColumns())
			.from(workSessions)
			.innerJoin(shiftAssignments, eq(shiftAssignments.id, workSessions.assignmentId))
			.innerJoin(machines, eq(machines.id, shiftAssignments.machineId))
			.innerJoin(employees, eq(employees.id, shiftAssignments.employeeId))
			.where(and(eq(shiftAssignments.employeeId, employeeId), isNull(workSessions.stoppedAt)))
			.orderBy(desc(workSessions.startedAt))
			.limit(1);
		return row ?? undefined;
	}

	/** Назначения сотрудника на конкретную дату с последней сессией по каждому. */
	async findContextsByEmployeeAndDate(employeeId: string, shiftDate: string): Promise<SessionContext[]> {
		const rows = await this.db
			.select(this.contextColumns())
			.from(shiftAssignments)
			.leftJoin(workSessions, eq(workSessions.assignmentId, shiftAssignments.id))
			.innerJoin(machines, eq(machines.id, shiftAssignments.machineId))
			.innerJoin(employees, eq(employees.id, shiftAssignments.employeeId))
			.where(and(eq(shiftAssignments.employeeId, employeeId), eq(shiftAssignments.shiftDate, shiftDate)))
			.orderBy(asc(shiftAssignments.shiftType), desc(workSessions.startedAt));
		return rows;
	}

	/** Контекст по конкретной сессии — для проверки прав и админской корректировки. */
	async findContextBySessionId(sessionId: string): Promise<SessionContext | undefined> {
		const [row] = await this.db
			.select(this.contextColumns())
			.from(workSessions)
			.innerJoin(shiftAssignments, eq(shiftAssignments.id, workSessions.assignmentId))
			.innerJoin(machines, eq(machines.id, shiftAssignments.machineId))
			.innerJoin(employees, eq(employees.id, shiftAssignments.employeeId))
			.where(eq(workSessions.id, sessionId))
			.limit(1);
		return row ?? undefined;
	}
}
