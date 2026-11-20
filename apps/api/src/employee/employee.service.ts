import { Injectable } from '@nestjs/common';
import type { AssignableEmployeeList, EmployeeList, GetAssignableInput, GetEmployeesInput } from './dto/employee';
import { EmployeeRepository } from './employee.repository';

@Injectable()
export class EmployeeService {
	constructor(private readonly repo: EmployeeRepository) {}

	async findAll(filters: GetEmployeesInput = {}): Promise<EmployeeList> {
		return this.repo.findAll(filters);
	}

	async findAssignable(input: GetAssignableInput): Promise<AssignableEmployeeList> {
		return this.repo.findAssignable(input);
	}
}
