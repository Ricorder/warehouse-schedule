import { Ctx, Input, Query, Router } from 'nestjs-trpc-v2';
import { requireAdmin } from '../common/auth.util';
import type { TRPCContextShape } from '../configs/trpc/context.interface';
import { ActivityLogService } from './activity-log.service';
import { type GetLogsInput, getLogsInput, type LogList, logList } from './dto/activity-log';

@Router({ alias: 'log' })
export class ActivityLogRouter {
	constructor(private readonly activityLogService: ActivityLogService) {}

	/** Журнал действий целиком — только администратору (ТЗ, раздел «Роли и права»). */
	@Query({ input: getLogsInput, output: logList })
	async getLogs(@Input() input: GetLogsInput, @Ctx() ctx: TRPCContextShape): Promise<LogList> {
		requireAdmin(ctx);
		return this.activityLogService.getLogs(input);
	}
}
