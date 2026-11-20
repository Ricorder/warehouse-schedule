import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { PAUSE_PRESETS, resolveIsProductive } from '../common/constants';
import type { AuthUser } from '../configs/trpc/context.interface';
import type { SelectPause } from '../configs/db/schema';
import type { PauseList, PauseOutput, PausePresetList } from './dto/pause';
import { PauseRepository } from './pause.repository';

@Injectable()
export class PauseService {
	constructor(
		private readonly pauseRepository: PauseRepository,
		private readonly activityLogService: ActivityLogService,
	) {}

	getPresets(): PausePresetList {
		return PAUSE_PRESETS.map((preset) => ({ ...preset }));
	}

	async findBySession(sessionId: string): Promise<PauseList> {
		const pauses = await this.pauseRepository.findBySessionId(sessionId);
		return pauses.map((pause) => serialize(pause));
	}

	async findActiveBySession(sessionId: string): Promise<SelectPause | undefined> {
		return this.pauseRepository.findActiveBySession(sessionId);
	}

	async startPause(user: AuthUser, sessionId: string, reason: string, isProductive = false): Promise<PauseOutput> {
		const ownership = await this.assertCanManage(user, sessionId);
		if (ownership.stoppedAt) {
			throw new BadRequestException('Смена уже завершена — паузу поставить нельзя');
		}
		const active = await this.pauseRepository.findActiveBySession(sessionId);
		if (active) {
			throw new BadRequestException('Пауза уже активна — сначала вернитесь к работе');
		}

		const trimmedReason = reason.trim();
		const pause = await this.pauseRepository.create({
			sessionId,
			reason: trimmedReason,
			isProductive: resolveIsProductive(trimmedReason, isProductive),
			startedAt: new Date(),
		});

		await this.activityLogService.log({
			userId: user.id,
			targetEmployeeId: ownership.employeeId,
			sessionId,
			action: 'pause',
			details: { reason: pause.reason, isProductive: pause.isProductive },
		});
		return serialize(pause);
	}

	async endPause(user: AuthUser, pauseId: string): Promise<PauseOutput> {
		const pause = await this.pauseRepository.findById(pauseId);
		if (!pause) {
			throw new NotFoundException('Пауза не найдена');
		}
		if (pause.endedAt) {
			throw new BadRequestException('Пауза уже завершена');
		}
		const ownership = await this.assertCanManage(user, pause.sessionId);

		const updated = await this.pauseRepository.update(pauseId, { endedAt: new Date() });
		if (!updated) {
			throw new NotFoundException('Пауза не найдена');
		}

		await this.activityLogService.log({
			userId: user.id,
			targetEmployeeId: ownership.employeeId,
			sessionId: pause.sessionId,
			action: 'resume',
			details: {
				reason: pause.reason,
				durationMs: updated.endedAt!.getTime() - updated.startedAt.getTime(),
			},
		});
		return serialize(updated);
	}

	/** Закрывает висящую паузу при остановке смены, чтобы не копилось «вечное» время паузы. */
	async closeActivePause(sessionId: string, at: Date): Promise<SelectPause | undefined> {
		const active = await this.pauseRepository.findActiveBySession(sessionId);
		if (!active) return undefined;
		return this.pauseRepository.update(active.id, { endedAt: at });
	}

	/** Управлять паузой может владелец сессии либо администратор. */
	private async assertCanManage(user: AuthUser, sessionId: string) {
		const ownership = await this.pauseRepository.findSessionOwnership(sessionId);
		if (!ownership) {
			throw new NotFoundException('Смена не найдена');
		}
		if (user.role !== 'admin' && ownership.employeeId !== user.id) {
			throw new ForbiddenException('Нельзя управлять чужой сменой');
		}
		return ownership;
	}
}

function serialize(pause: SelectPause): PauseOutput {
	return {
		...pause,
		startedAt: pause.startedAt.toISOString(),
		endedAt: pause.endedAt?.toISOString() ?? null,
	};
}
