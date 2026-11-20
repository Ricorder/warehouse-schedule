import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { MAX_EMPLOYEES_PER_MACHINE } from '../common/constants';
import { enumerateDates } from '../common/date.util';
import {
	calculateSessionDurations,
	resolveSessionStatus,
	type SessionStatus,
	sumDurations,
} from '../common/time.util';
import type { SelectPause, SelectShiftAssignment, SelectWorkSession } from '../configs/db/schema';
import { MachineService } from '../machine/machine.service';
import type {
	AssignmentOutput,
	EmployeeTotal,
	GetScheduleInput,
	ScheduleEntry,
	ScheduleOutput,
	ScheduleRow,
	ShiftType,
} from './dto/shift-assignment';
import { type AssignmentRow, ShiftAssignmentRepository } from './shift-assignment.repository';

const ALL_SHIFTS: ShiftType[] = ['day', 'night'];

@Injectable()
export class ShiftAssignmentService {
	constructor(
		private readonly repo: ShiftAssignmentRepository,
		private readonly machineService: MachineService,
		private readonly activityLogService: ActivityLogService,
	) {}

	private serialize(assignment: SelectShiftAssignment): AssignmentOutput {
		return { ...assignment, createdAt: assignment.createdAt.toISOString() };
	}

	async findById(id: string): Promise<AssignmentOutput> {
		const assignment = await this.repo.findById(id);
		if (!assignment) {
			throw new NotFoundException(`Назначение с ID ${id} не найдено`);
		}
		return this.serialize(assignment);
	}

	async findByEmployeeAndShift(
		employeeId: string,
		shiftDate: string,
		shiftType: ShiftType,
	): Promise<SelectShiftAssignment | undefined> {
		return this.repo.findByEmployeeAndShift(employeeId, shiftDate, shiftType);
	}

	/**
	 * Создаёт назначение с проверкой обоих ограничений ТЗ:
	 * максимум 6 человек на станке и не более одного станка на смену.
	 */
	async createAssignment(
		employeeId: string,
		machineId: string,
		shiftDate: string,
		shiftType: ShiftType,
	): Promise<SelectShiftAssignment> {
		const existing = await this.repo.findByEmployeeAndShift(employeeId, shiftDate, shiftType);
		if (existing) {
			if (existing.machineId === machineId) {
				throw new ConflictException('Сотрудник уже назначен на этот станок в эту смену');
			}
			const machine = await this.machineService.findById(existing.machineId);
			throw new ConflictException(
				`Сотрудник уже занят в эту смену на «${machine.name}» — нельзя назначить на два станка сразу`,
			);
		}

		const currentCount = await this.repo.countOnMachine(machineId, shiftDate, shiftType);
		if (currentCount >= MAX_EMPLOYEES_PER_MACHINE) {
			throw new BadRequestException(
				`На станке уже максимум сотрудников (${MAX_EMPLOYEES_PER_MACHINE}) в эту смену`,
			);
		}

		return this.repo.create({ employeeId, machineId, shiftDate, shiftType });
	}

	/** Назначение сотрудника администратором — с записью в журнал. */
	async assignEmployee(
		adminId: string,
		employeeId: string,
		machineId: string,
		shiftDate: string,
		shiftType: ShiftType,
	): Promise<AssignmentOutput> {
		const machine = await this.machineService.findById(machineId);
		const assignment = await this.createAssignment(employeeId, machineId, shiftDate, shiftType);
		await this.activityLogService.log({
			userId: adminId,
			targetEmployeeId: employeeId,
			assignmentId: assignment.id,
			action: 'admin_assign',
			details: { machineName: machine.name, shiftDate, shiftType },
		});
		return this.serialize(assignment);
	}

	async unassignEmployee(adminId: string, assignmentId: string): Promise<void> {
		const assignment = await this.repo.findById(assignmentId);
		if (!assignment) {
			throw new NotFoundException('Назначение не найдено');
		}
		const machine = await this.machineService.findById(assignment.machineId);
		// Журналируем до удаления: FK на assignment каскадный, ссылку не сохраняем.
		await this.activityLogService.log({
			userId: adminId,
			targetEmployeeId: assignment.employeeId,
			action: 'admin_unassign',
			details: {
				machineName: machine.name,
				shiftDate: assignment.shiftDate,
				shiftType: assignment.shiftType,
			},
		});
		await this.repo.delete(assignmentId);
	}

	/** Собирает недельную сетку «станок × смена» × дата со статусами и подсчётом времени. */
	async getSchedule(input: GetScheduleInput): Promise<ScheduleOutput> {
		const dates = enumerateDates(input.from, input.to);
		if (dates.length === 0) {
			throw new BadRequestException('Некорректный диапазон дат');
		}

		const [assignments, machines] = await Promise.all([
			this.repo.findSchedule(input),
			this.machineService.findAll(input.machineType),
		]);

		const sessions = await this.repo.findSessionsByAssignmentIds(assignments.map((a) => a.id));
		const pauses = await this.repo.findPausesBySessionIds(sessions.map((s) => s.id));

		const sessionsByAssignment = groupBy(sessions, (s) => s.assignmentId);
		const pausesBySession = groupBy(pauses, (p) => p.sessionId);
		const now = new Date();

		const entriesByKey = new Map<string, ScheduleEntry[]>();
		const totals = new Map<string, EmployeeTotal>();

		for (const assignment of assignments) {
			const entry = this.buildEntry(assignment, sessionsByAssignment, pausesBySession, now);
			const key = cellKey(assignment.machineId, assignment.shiftType, assignment.shiftDate);
			const bucket = entriesByKey.get(key);
			if (bucket) bucket.push(entry);
			else entriesByKey.set(key, [entry]);

			const total = totals.get(assignment.employeeId) ?? {
				employeeId: assignment.employeeId,
				employeeName: assignment.employeeName,
				workMs: 0,
				pauseMs: 0,
				totalMs: 0,
				shiftsCount: 0,
			};
			total.workMs += entry.workMs;
			total.pauseMs += entry.pauseMs;
			total.totalMs += entry.totalMs;
			total.shiftsCount += 1;
			totals.set(assignment.employeeId, total);
		}

		const shiftTypes = input.shiftType ? [input.shiftType] : ALL_SHIFTS;
		const rows: ScheduleRow[] = [];
		for (const machine of machines) {
			for (const shift of shiftTypes) {
				rows.push({
					machineId: machine.id,
					machineName: machine.name,
					machineType: machine.type,
					shiftType: shift,
					cells: dates.map((date) => ({
						date,
						entries: entriesByKey.get(cellKey(machine.id, shift, date)) ?? [],
					})),
				});
			}
		}

		return {
			dates,
			rows: input.onlyBusy ? rows.filter((row) => row.cells.some((cell) => cell.entries.length > 0)) : rows,
			totals: [...totals.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'ru')),
			maxPerMachine: MAX_EMPLOYEES_PER_MACHINE,
		};
	}

	/** Собственные смены сотрудника за период — только для просмотра (бизнес-правило ТЗ). */
	async getEmployeeHistory(employeeId: string, from: string, to: string) {
		const assignments = await this.repo.findByEmployeeInRange(employeeId, from, to);
		const sessions = await this.repo.findSessionsByAssignmentIds(assignments.map((a) => a.id));
		const pauses = await this.repo.findPausesBySessionIds(sessions.map((s) => s.id));
		const sessionsByAssignment = groupBy(sessions, (s) => s.assignmentId);
		const pausesBySession = groupBy(pauses, (p) => p.sessionId);
		const now = new Date();

		const items = assignments.map((assignment) => {
			const entry = this.buildEntry(assignment, sessionsByAssignment, pausesBySession, now);
			return {
				...entry,
				shiftDate: assignment.shiftDate,
				shiftType: assignment.shiftType,
				machineName: assignment.machineName,
				machineType: assignment.machineType,
			};
		});

		const summary = sumDurations(
			items.map((item) => ({
				totalMs: item.totalMs,
				pauseMs: item.pauseMs,
				productivePauseMs: 0,
				workMs: item.workMs,
			})),
		);

		return {
			items,
			summary: { workMs: summary.workMs, pauseMs: summary.pauseMs, totalMs: summary.totalMs },
		};
	}

	private buildEntry(
		assignment: AssignmentRow,
		sessionsByAssignment: Map<string, SelectWorkSession[]>,
		pausesBySession: Map<string, SelectPause[]>,
		now: Date,
	): ScheduleEntry {
		const sessions = sessionsByAssignment.get(assignment.id) ?? [];
		const durations = sumDurations(
			sessions.map((session) =>
				calculateSessionDurations(session, pausesBySession.get(session.id) ?? [], now),
			),
		);
		const activeSession = sessions.find((session) => session.stoppedAt === null);
		const status: SessionStatus = activeSession
			? resolveSessionStatus(activeSession, pausesBySession.get(activeSession.id) ?? [])
			: sessions.length > 0
				? 'stopped'
				: 'idle';
		const lastSession = activeSession ?? sessions[sessions.length - 1];

		return {
			assignmentId: assignment.id,
			employeeId: assignment.employeeId,
			employeeName: assignment.employeeName,
			sessionId: lastSession?.id ?? null,
			sessionStartedAt: lastSession?.startedAt.toISOString() ?? null,
			sessionStoppedAt: lastSession?.stoppedAt?.toISOString() ?? null,
			status,
			workMs: durations.workMs,
			pauseMs: durations.pauseMs,
			totalMs: durations.totalMs,
		};
	}
}

function cellKey(machineId: string, shiftType: ShiftType, date: string): string {
	return `${machineId}|${shiftType}|${date}`;
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
	const map = new Map<string, T[]>();
	for (const item of items) {
		const key = keyOf(item);
		const bucket = map.get(key);
		if (bucket) bucket.push(item);
		else map.set(key, [item]);
	}
	return map;
}
