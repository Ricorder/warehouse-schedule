import { Ctx, Input, Mutation, Query, Router } from 'nestjs-trpc-v2';
import { requireAdmin } from '../common/auth.util';
import { toTRPCError } from '../common/trpc-error.util';
import type { TRPCContextShape } from '../configs/trpc/context.interface';
import {
	type AssignEmployeeInput,
	assignEmployeeInput,
	type AssignmentOutput,
	assignmentOutput,
	type GetScheduleInput,
	getScheduleInput,
	type ScheduleOutput,
	scheduleOutput,
	type UnassignEmployeeInput,
	unassignEmployeeInput,
} from './dto/shift-assignment';
import { ShiftAssignmentService } from './shift-assignment.service';

@Router({ alias: 'shift' })
export class ShiftAssignmentRouter {
	constructor(private readonly shiftAssignmentService: ShiftAssignmentService) {}

	/** Недельная сетка распределения — интерфейс администратора. */
	@Query({ input: getScheduleInput, output: scheduleOutput })
	async getSchedule(@Input() input: GetScheduleInput, @Ctx() ctx: TRPCContextShape): Promise<ScheduleOutput> {
		requireAdmin(ctx);
		try {
			return await this.shiftAssignmentService.getSchedule(input);
		} catch (error) {
			throw toTRPCError(error, 'Не удалось загрузить расписание');
		}
	}

	@Mutation({ input: assignEmployeeInput, output: assignmentOutput })
	async assignEmployee(
		@Input() input: AssignEmployeeInput,
		@Ctx() ctx: TRPCContextShape,
	): Promise<AssignmentOutput> {
		const admin = requireAdmin(ctx);
		try {
			return await this.shiftAssignmentService.assignEmployee(
				admin.id,
				input.employeeId,
				input.machineId,
				input.shiftDate,
				input.shiftType,
			);
		} catch (error) {
			throw toTRPCError(error, 'Не удалось назначить сотрудника');
		}
	}

	@Mutation({ input: unassignEmployeeInput })
	async unassignEmployee(
		@Input() input: UnassignEmployeeInput,
		@Ctx() ctx: TRPCContextShape,
	): Promise<{ success: boolean }> {
		const admin = requireAdmin(ctx);
		try {
			await this.shiftAssignmentService.unassignEmployee(admin.id, input.assignmentId);
			return { success: true };
		} catch (error) {
			throw toTRPCError(error, 'Не удалось снять сотрудника со смены');
		}
	}
}
