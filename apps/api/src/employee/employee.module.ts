import { Module } from '@nestjs/common';
import { EmployeeRouter } from './employee.controller';
import { EmployeeRepository } from './employee.repository';
import { EmployeeService } from './employee.service';

@Module({
	providers: [EmployeeRouter, EmployeeService, EmployeeRepository],
	exports: [EmployeeService],
})
export class EmployeeModule {}
