import { Ctx, Input, Query, Router } from 'nestjs-trpc-v2';
import { requireAdmin } from '../common/auth.util';
import type { TRPCContextShape } from '../configs/trpc/context.interface';
import {
	type AssignableEmployeeList,
	assignableEmployeeList,
	type EmployeeList,
	employeeList,
	type GetAssignableInput,
	getAssignableInput,
	type GetEmployeesInput,
	getEmployeesInput,
} from './dto/employee';
import { EmployeeService } from './employee.service';

@Router({ alias: 'employee' })
export class EmployeeRouter {
	constructor(private readonly employeeService: EmployeeService) {}

	@Query({ input: getEmployeesInput, output: employeeList })
	async getEmployees(@Input() input: GetEmployeesInput, @Ctx() ctx: TRPCContextShape): Promise<EmployeeList> {
		requireAdmin(ctx);
		return this.employeeService.findAll(input);
	}

	/** Список для выпадающего меню «(+)» с пометкой занятости в выбранной смене. */
	@Query({ input: getAssignableInput, output: assignableEmployeeList })
	async getAssignable(
		@Input() input: GetAssignableInput,
		@Ctx() ctx: TRPCContextShape,
	): Promise<AssignableEmployeeList> {
		requireAdmin(ctx);
		return this.employeeService.findAssignable(input);
	}
}
