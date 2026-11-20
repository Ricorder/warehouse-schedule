import { Module } from '@nestjs/common';
import { ActivityLogRepository } from './activity-log.repository';
import { ActivityLogRouter } from './activity-log.controller';
import { ActivityLogService } from './activity-log.service';

@Module({
	providers: [ActivityLogRouter, ActivityLogService, ActivityLogRepository],
	exports: [ActivityLogService],
})
export class ActivityLogModule {}
