import { Ctx, Input, Mutation, Query, Router } from 'nestjs-trpc-v2';
import { requireAdmin, requireUser } from '../common/auth.util';
import { toTRPCError } from '../common/trpc-error.util';
import type { TRPCContextShape } from '../configs/trpc/context.interface';
import {
	type AddCommentInput,
	addCommentInput,
	type AdjustSessionInput,
	adjustSessionInput,
	type CurrentShiftOutput,
	currentShiftOutput,
	type GetHistoryInput,
	getHistoryInput,
	type HistoryOutput,
	historyOutput,
	type SessionOutput,
	sessionOutput,
	type StartSessionInput,
	startSessionInput,
	type StopSessionInput,
	stopSessionInput,
} from './dto/work-session';
import { WorkSessionService } from './work-session.service';

@Router({ alias: 'session' })
export class WorkSessionRouter {
	constructor(private readonly workSessionService: WorkSessionService) {}

	/** Состояние текущей смены сотрудника; null — на сегодня назначения нет. */
	@Query({ output: currentShiftOutput.nullable() })
	async getCurrent(@Ctx() ctx: TRPCContextShape): Promise<CurrentShiftOutput | null> {
		const user = requireUser(ctx);
		try {
			return await this.workSessionService.getCurrent(user.id);
		} catch (error) {
			throw toTRPCError(error, 'Не удалось загрузить текущую смену');
		}
	}

	/** Своя история смен — только для просмотра. */
	@Query({ input: getHistoryInput, output: historyOutput })
	async getMyHistory(@Input() input: GetHistoryInput, @Ctx() ctx: TRPCContextShape): Promise<HistoryOutput> {
		const user = requireUser(ctx);
		try {
			return await this.workSessionService.getHistory(user.id, input.from, input.to);
		} catch (error) {
			throw toTRPCError(error, 'Не удалось загрузить историю смен');
		}
	}

	@Mutation({ input: startSessionInput, output: currentShiftOutput })
	async startSession(
		@Input() input: StartSessionInput,
		@Ctx() ctx: TRPCContextShape,
	): Promise<CurrentShiftOutput> {
		const user = requireUser(ctx);
		try {
			return await this.workSessionService.startSession(user, input);
		} catch (error) {
			throw toTRPCError(error, 'Не удалось запустить смену');
		}
	}

	@Mutation({ input: stopSessionInput, output: currentShiftOutput })
	async stopSession(@Input() input: StopSessionInput, @Ctx() ctx: TRPCContextShape): Promise<CurrentShiftOutput> {
		const user = requireUser(ctx);
		try {
			return await this.workSessionService.stopSession(user, input.sessionId);
		} catch (error) {
			throw toTRPCError(error, 'Не удалось завершить смену');
		}
	}

	@Mutation({ input: addCommentInput })
	async addComment(@Input() input: AddCommentInput, @Ctx() ctx: TRPCContextShape): Promise<{ success: boolean }> {
		const user = requireUser(ctx);
		try {
			await this.workSessionService.addComment(user, input.sessionId, input.comment);
			return { success: true };
		} catch (error) {
			throw toTRPCError(error, 'Не удалось добавить комментарий');
		}
	}

	/** Корректировка времени администратором — фиксируется в журнале. */
	@Mutation({ input: adjustSessionInput, output: sessionOutput })
	async adjustSession(
		@Input() input: AdjustSessionInput,
		@Ctx() ctx: TRPCContextShape,
	): Promise<SessionOutput> {
		const admin = requireAdmin(ctx);
		try {
			return await this.workSessionService.adjustSession(admin, input);
		} catch (error) {
			throw toTRPCError(error, 'Не удалось скорректировать время смены');
		}
	}
}
