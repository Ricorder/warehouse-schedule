import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, gte, ilike, inArray, lte, type SQL } from 'drizzle-orm';
import type { DrizzleDB } from '../configs/db/drizzle';
import { DrizzleAsyncProvider } from '../configs/db/drizzle.provider';
import {
	employees,
	type InsertShiftAssignment,
	machines,
	pauses,
	type SelectPause,
	type SelectShiftAssignment,
	type SelectWorkSession,
	shiftAssignments,
	workSessions,
} from '../configs/db/schema';
import type { GetScheduleInput, ShiftType } from './dto/shift-assignment';

/** Назначение вместе с именами сотрудника и станка — строка расписания. */
export interface AssignmentRow extends SelectShiftAssignment {
	employeeName: string;
	machineName: string;
	machineType: 'machine' | 'table';
}

@Injectable()
export class ShiftAssignmentRepository {
	constructor(@Inject(DrizzleAsyncProvider) private readonly db: DrizzleDB) {}

	async findById(id: string): Promise<SelectShiftAssignment | undefined> {
		const [assignment] = await this.db
			.select()
			.from(shiftAssignments)
			.where(eq(shiftAssignments.id, id))
			.limit(1);
		return assignment;
	}

	async create(data: InsertShiftAssignment): Promise<SelectShiftAssignment> {
		const [assignment] = await this.db.insert(shiftAssignments).values(data).returning();
		return assignment;
	}

	async delete(id: string): Promise<void> {
		await this.db.delete(shiftAssignments).where(eq(shiftAssignments.id, id));
	}

	async findByEmployeeAndShift(
		employeeId: string,
		shiftDate: string,
		shiftType: ShiftType,
	): Promise<SelectShiftAssignment | undefined> {
		const [assignment] = await this.db
			.select()
			.from(shiftAssignments)
			.where(
				and(
					eq(shiftAssignments.employeeId, employeeId),
					eq(shiftAssignments.shiftDate, shiftDate),
					eq(shiftAssignments.shiftType, shiftType),
				),
			)
			.limit(1);
		return assignment;
	}

	/** Сколько человек уже стоит на станке в эту смену — для лимита в 6 человек. */
	async countOnMachine(machineId: string, shiftDate: string, shiftType: ShiftType): Promise<number> {
		const [row] = await this.db
			.select({ value: count() })
			.from(shiftAssignments)
			.where(
				and(
					eq(shiftAssignments.machineId, machineId),
					eq(shiftAssignments.shiftDate, shiftDate),
					eq(shiftAssignments.shiftType, shiftType),
				),
			);
		return Number(row?.value ?? 0);
	}

	async findSchedule(input: GetScheduleInput): Promise<AssignmentRow[]> {
		const conditions: SQL[] = [
			gte(shiftAssignments.shiftDate, input.from),
			lte(shiftAssignments.shiftDate, input.to),
		];
		if (input.shiftType) conditions.push(eq(shiftAssignments.shiftType, input.shiftType));
		if (input.machineType) conditions.push(eq(machines.type, input.machineType));
		if (input.search?.trim()) conditions.push(ilike(employees.name, `%${input.search.trim()}%`));

		return this.db
			.select({
				id: shiftAssignments.id,
				employeeId: shiftAssignments.employeeId,
				machineId: shiftAssignments.machineId,
				shiftDate: shiftAssignments.shiftDate,
				shiftType: shiftAssignments.shiftType,
				createdAt: shiftAssignments.createdAt,
				employeeName: employees.name,
				machineName: machines.name,
				machineType: machines.type,
			})
			.from(shiftAssignments)
			.innerJoin(employees, eq(employees.id, shiftAssignments.employeeId))
			.innerJoin(machines, eq(machines.id, shiftAssignments.machineId))
			.where(and(...conditions))
			.orderBy(asc(machines.name), asc(shiftAssignments.shiftDate), asc(employees.name));
	}

	async findSessionsByAssignmentIds(assignmentIds: string[]): Promise<SelectWorkSession[]> {
		if (assignmentIds.length === 0) return [];
		return this.db
			.select()
			.from(workSessions)
			.where(inArray(workSessions.assignmentId, assignmentIds))
			.orderBy(asc(workSessions.startedAt));
	}

	async findPausesBySessionIds(sessionIds: string[]): Promise<SelectPause[]> {
		if (sessionIds.length === 0) return [];
		return this.db
			.select()
			.from(pauses)
			.where(inArray(pauses.sessionId, sessionIds))
			.orderBy(asc(pauses.startedAt));
	}

	/** Назначения сотрудника за период — для страницы «моя история». */
	async findByEmployeeInRange(employeeId: string, from: string, to: string): Promise<AssignmentRow[]> {
		return this.db
			.select({
				id: shiftAssignments.id,
				employeeId: shiftAssignments.employeeId,
				machineId: shiftAssignments.machineId,
				shiftDate: shiftAssignments.shiftDate,
				shiftType: shiftAssignments.shiftType,
				createdAt: shiftAssignments.createdAt,
				employeeName: employees.name,
				machineName: machines.name,
				machineType: machines.type,
			})
			.from(shiftAssignments)
			.innerJoin(employees, eq(employees.id, shiftAssignments.employeeId))
			.innerJoin(machines, eq(machines.id, shiftAssignments.machineId))
			.where(
				and(
					eq(shiftAssignments.employeeId, employeeId),
					gte(shiftAssignments.shiftDate, from),
					lte(shiftAssignments.shiftDate, to),
				),
			)
			.orderBy(asc(shiftAssignments.shiftDate));
	}
}
