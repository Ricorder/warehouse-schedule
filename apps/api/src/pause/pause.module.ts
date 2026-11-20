import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { PauseRouter } from './pause.controller';
import { PauseRepository } from './pause.repository';
import { PauseService } from './pause.service';

@Module({
	imports: [ActivityLogModule],
	providers: [PauseRouter, PauseService, PauseRepository],
	exports: [PauseService],
})
export class PauseModule {}
