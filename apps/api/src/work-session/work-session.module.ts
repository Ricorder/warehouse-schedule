import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { PauseModule } from '../pause/pause.module';
import { ShiftAssignmentModule } from '../shift-assignment/shift-assignment.module';
import { WorkSessionRouter } from './work-session.controller';
import { WorkSessionRepository } from './work-session.repository';
import { WorkSessionService } from './work-session.service';

@Module({
	imports: [ShiftAssignmentModule, ActivityLogModule, PauseModule],
	providers: [WorkSessionRouter, WorkSessionService, WorkSessionRepository],
	exports: [WorkSessionService],
})
export class WorkSessionModule {}
