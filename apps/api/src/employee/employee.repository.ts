import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, type SQL } from 'drizzle-orm';
import type { DrizzleDB } from '../configs/db/drizzle';
import { DrizzleAsyncProvider } from '../configs/db/drizzle.provider';
import { employees, machines, shiftAssignments } from '../configs/db/schema';
import type { AssignableEmployeeList, EmployeeList, GetAssignableInput, GetEmployeesInput } from './dto/employee';

@Injectable()
export class EmployeeRepository {
	constructor(@Inject(DrizzleAsyncProvider) private readonly db: DrizzleDB) {}

	async findAll(filters: GetEmployeesInput = {}): Promise<EmployeeList> {
		const conditions: SQL[] = [];
		if (filters.role) conditions.push(eq(employees.role, filters.role));
		if (filters.search?.trim()) conditions.push(ilike(employees.name, `%${filters.search.trim()}%`));

		const query = this.db
			.select({
				id: employees.id,
				name: employees.name,
				email: employees.email,
				role: employees.role,
			})
			.from(employees);

		const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
		return filtered.orderBy(asc(employees.name));
	}

	/**
	 * Сотрудники с пометкой «уже занят в этой смене».
	 * LEFT JOIN по (дата, смена) даёт станок, на который сотрудник уже назначен.
	 */
	async findAssignable(input: GetAssignableInput): Promise<AssignableEmployeeList> {
		const conditions: SQL[] = [];
		if (input.search?.trim()) conditions.push(ilike(employees.name, `%${input.search.trim()}%`));

		const query = this.db
			.select({
				id: employees.id,
				name: employees.name,
				role: employees.role,
				busyMachineId: machines.id,
				busyMachineName: machines.name,
			})
			.from(employees)
			.leftJoin(
				shiftAssignments,
				and(
					eq(shiftAssignments.employeeId, employees.id),
					eq(shiftAssignments.shiftDate, input.shiftDate),
					eq(shiftAssignments.shiftType, input.shiftType),
				),
			)
			.leftJoin(machines, eq(machines.id, shiftAssignments.machineId));

		const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
		const rows = await filtered.orderBy(asc(employees.name));

		return rows.map((row) => ({
			id: row.id,
			name: row.name,
			role: row.role,
			busy: row.busyMachineId !== null,
			busyMachineId: row.busyMachineId,
			busyMachineName: row.busyMachineName,
		}));
	}
}
