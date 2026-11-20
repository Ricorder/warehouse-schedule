import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { MachineModule } from '../machine/machine.module';
import { ShiftAssignmentRouter } from './shift-assignment.controller';
import { ShiftAssignmentRepository } from './shift-assignment.repository';
import { ShiftAssignmentService } from './shift-assignment.service';

@Module({
	imports: [MachineModule, ActivityLogModule],
	providers: [ShiftAssignmentRouter, ShiftAssignmentService, ShiftAssignmentRepository],
	exports: [ShiftAssignmentService],
})
export class ShiftAssignmentModule {}
