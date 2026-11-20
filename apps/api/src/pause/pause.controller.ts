import { Ctx, Input, Mutation, Query, Router } from 'nestjs-trpc-v2';
import { requireUser } from '../common/auth.util';
import { toTRPCError } from '../common/trpc-error.util';
import type { TRPCContextShape } from '../configs/trpc/context.interface';
import {
	type EndPauseInput,
	endPauseInput,
	type PauseOutput,
	pauseOutput,
	type PausePresetList,
	pausePresetList,
	type StartPauseInput,
	startPauseInput,
} from './dto/pause';
import { PauseService } from './pause.service';

@Router({ alias: 'pause' })
export class PauseRouter {
	constructor(private readonly pauseService: PauseService) {}

	/** Типовые причины паузы из ТЗ (обед / курить / вызвали помочь). */
	@Query({ output: pausePresetList })
	async getPresets(): Promise<PausePresetList> {
		return this.pauseService.getPresets();
	}

	@Mutation({ input: startPauseInput, output: pauseOutput })
	async startPause(@Input() input: StartPauseInput, @Ctx() ctx: TRPCContextShape): Promise<PauseOutput> {
		const user = requireUser(ctx);
		try {
			return await this.pauseService.startPause(user, input.sessionId, input.reason, input.isProductive ?? false);
		} catch (error) {
			throw toTRPCError(error, 'Не удалось поставить паузу');
		}
	}

	@Mutation({ input: endPauseInput, output: pauseOutput })
	async endPause(@Input() input: EndPauseInput, @Ctx() ctx: TRPCContextShape): Promise<PauseOutput> {
		const user = requireUser(ctx);
		try {
			return await this.pauseService.endPause(user, input.pauseId);
		} catch (error) {
			throw toTRPCError(error, 'Не удалось завершить паузу');
		}
	}
}
