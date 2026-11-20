import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { ActivityLogService } from '../activity-log/activity-log.service';
import type { LogList } from '../activity-log/dto/activity-log';
import { guessShiftType, toShiftDate } from '../common/date.util';
import { calculateSessionDurations, resolveSessionStatus } from '../common/time.util';
import type { AuthUser } from '../configs/trpc/context.interface';
import type { PauseList } from '../pause/dto/pause';
import { PauseService } from '../pause/pause.service';
import { ShiftAssignmentService } from '../shift-assignment/shift-assignment.service';
import type {
	AdjustSessionInput,
	CurrentShiftOutput,
	HistoryOutput,
	SessionOutput,
	StartSessionInput,
} from './dto/work-session';
import { type SessionContext, WorkSessionRepository } from './work-session.repository';

@Injectable()
export class WorkSessionService {
	constructor(
		private readonly repository: WorkSessionRepository,
		private readonly shiftAssignmentService: ShiftAssignmentService,
		private readonly activityLogService: ActivityLogService,
		private readonly pauseService: PauseService,
	) {}

	/**
	 * Текущее состояние смены сотрудника: сначала ищем незакрытую смену
	 * (ночная может перейти через полночь), иначе — назначение на сегодня.
	 */
	async getCurrent(employeeId: string): Promise<CurrentShiftOutput | null> {
		const active = await this.repository.findActiveContextByEmployee(employeeId);
		const context = active ?? (await this.findTodayContext(employeeId));
		if (!context) return null;
		return this.buildCurrentShift(context);
	}

	private async findTodayContext(employeeId: string): Promise<SessionContext | undefined> {
		const rows = await this.repository.findContextsByEmployeeAndDate(employeeId, toShiftDate());
		if (rows.length === 0) return undefined;

		// На одно назначение может быть несколько сессий — берём самую свежую.
		const latestPerAssignment = new Map<string, SessionContext>();
		for (const row of rows) {
			if (!latestPerAssignment.has(row.assignmentId)) {
				latestPerAssignment.set(row.assignmentId, row);
			}
		}
		const contexts = [...latestPerAssignment.values()];
		const preferredShift = guessShiftType();
		return contexts.find((c) => c.shiftType === preferredShift) ?? contexts[0];
	}

	private async buildCurrentShift(context: SessionContext): Promise<CurrentShiftOutput> {
		const session = context.session;
		const [pauses, logs] = await Promise.all([
			session ? this.pauseService.findBySession(session.id) : Promise.resolve<PauseList>([]),
			session ? this.activityLogService.getBySessionId(session.id) : Promise.resolve<LogList>([]),
		]);

		const now = new Date();
		const pauseIntervals = pauses.map((pause) => ({
			startedAt: new Date(pause.startedAt),
			endedAt: pause.endedAt ? new Date(pause.endedAt) : null,
			isProductive: pause.isProductive,
		}));
		const durations = session
			? calculateSessionDurations(session, pauseIntervals, now)
			: { workMs: 0, pauseMs: 0, productivePauseMs: 0, totalMs: 0 };

		return {
			employee: { id: context.employeeId, name: context.employeeName },
			assignment: {
				id: context.assignmentId,
				shiftDate: context.shiftDate,
				shiftType: context.shiftType,
				machineId: context.machineId,
				machineName: context.machineName,
				machineType: context.machineType,
			},
			session: session
				? {
						id: session.id,
						assignmentId: session.assignmentId,
						startedAt: session.startedAt.toISOString(),
						stoppedAt: session.stoppedAt?.toISOString() ?? null,
					}
				: null,
			status: resolveSessionStatus(session, pauseIntervals),
			pauses,
			activePause: pauses.find((pause) => pause.endedAt === null) ?? null,
			logs,
			durations,
			serverTime: now.toISOString(),
		};
	}

	/** Старт смены: сотрудник сам выбирает станок и смену (ТЗ, «Интерфейс сотрудника»). */
	async startSession(user: AuthUser, input: StartSessionInput): Promise<CurrentShiftOutput> {
		const active = await this.repository.findActiveContextByEmployee(user.id);
		if (active) {
			throw new ConflictException(
				`Смена уже идёт на «${active.machineName}» — сначала завершите её`,
			);
		}

		const shiftDate = input.shiftDate ?? toShiftDate();
		const existing = await this.shiftAssignmentService.findByEmployeeAndShift(
			user.id,
			shiftDate,
			input.shiftType,
		);

		let assignmentId: string;
		if (existing) {
			if (existing.machineId !== input.machineId) {
				// Администратор уже поставил сотрудника на другой станок в эту смену.
				const assigned = await this.shiftAssignmentService.findById(existing.id);
				throw new ConflictException(
					`На эту смену вы назначены на другой станок (назначение от ${new Date(assigned.createdAt).toLocaleDateString('ru-RU')}). Обратитесь к администратору.`,
				);
			}
			assignmentId = existing.id;
		} else {
			const created = await this.shiftAssignmentService.createAssignment(
				user.id,
				input.machineId,
				shiftDate,
				input.shiftType,
			);
			assignmentId = created.id;
		}

		const running = await this.repository.findActiveByAssignment(assignmentId);
		if (running) {
			throw new ConflictException('Смена уже запущена');
		}

		const session = await this.repository.create({ assignmentId, startedAt: new Date() });
		await this.activityLogService.log({
			userId: user.id,
			targetEmployeeId: user.id,
			sessionId: session.id,
			assignmentId,
			action: 'start',
		});

		const context = await this.repository.findContextBySessionId(session.id);
		if (!context) {
			throw new NotFoundException('Смена не найдена сразу после создания');
		}
		return this.buildCurrentShift(context);
	}

	/** Стоп смены: закрываем висящую паузу и пишем итоги в журнал. */
	async stopSession(user: AuthUser, sessionId: string): Promise<CurrentShiftOutput> {
		const context = await this.assertCanManage(user, sessionId);
		const session = context.session;
		if (!session) {
			throw new NotFoundException('Смена не найдена');
		}
		if (session.stoppedAt) {
			throw new BadRequestException('Смена уже завершена');
		}

		const stoppedAt = new Date();
		await this.pauseService.closeActivePause(sessionId, stoppedAt);
		const updated = await this.repository.update(sessionId, { stoppedAt });
		if (!updated) {
			throw new NotFoundException('Смена не найдена');
		}

		const pauses = await this.pauseService.findBySession(sessionId);
		const durations = calculateSessionDurations(
			updated,
			pauses.map((pause) => ({
				startedAt: new Date(pause.startedAt),
				endedAt: pause.endedAt ? new Date(pause.endedAt) : null,
				isProductive: pause.isProductive,
			})),
			stoppedAt,
		);

		await this.activityLogService.log({
			userId: user.id,
			targetEmployeeId: context.employeeId,
			sessionId,
			assignmentId: context.assignmentId,
			action: 'stop',
			details: {
				workMs: durations.workMs,
				pauseMs: durations.pauseMs,
				totalMs: durations.totalMs,
			},
		});

		return this.buildCurrentShift({ ...context, session: updated });
	}

	/** Свободный комментарий к смене — кнопка «+ Добавить комментарий» из ТЗ. */
	async addComment(user: AuthUser, sessionId: string, comment: string): Promise<void> {
		const context = await this.assertCanManage(user, sessionId);
		await this.activityLogService.log({
			userId: user.id,
			targetEmployeeId: context.employeeId,
			sessionId,
			assignmentId: context.assignmentId,
			action: 'comment',
			details: { comment: comment.trim() },
		});
	}

	/**
	 * Корректировка времени администратором.
	 * ТЗ: «Администратор может скорректировать время работы сотрудника
	 * с сохранением информации об этих действиях».
	 */
	async adjustSession(admin: AuthUser, input: AdjustSessionInput): Promise<SessionOutput> {
		const context = await this.repository.findContextBySessionId(input.sessionId);
		if (!context?.session) {
			throw new NotFoundException('Смена не найдена');
		}

		const startedAt = parseDate(input.startedAt, 'начала смены');
		const stoppedAt = input.stoppedAt ? parseDate(input.stoppedAt, 'окончания смены') : null;
		if (stoppedAt && stoppedAt.getTime() <= startedAt.getTime()) {
			throw new BadRequestException('Окончание смены должно быть позже её начала');
		}

		const before = context.session;
		const updated = await this.repository.update(input.sessionId, { startedAt, stoppedAt });
		if (!updated) {
			throw new NotFoundException('Смена не найдена');
		}

		await this.activityLogService.log({
			userId: admin.id,
			targetEmployeeId: context.employeeId,
			sessionId: input.sessionId,
			assignmentId: context.assignmentId,
			action: 'admin_edit',
			details: {
				startedAtBefore: before.startedAt.toISOString(),
				startedAtAfter: updated.startedAt.toISOString(),
				stoppedAtBefore: before.stoppedAt?.toISOString(),
				stoppedAtAfter: updated.stoppedAt?.toISOString(),
				comment: input.comment?.trim(),
			},
		});

		return {
			id: updated.id,
			assignmentId: updated.assignmentId,
			startedAt: updated.startedAt.toISOString(),
			stoppedAt: updated.stoppedAt?.toISOString() ?? null,
		};
	}

	async getHistory(employeeId: string, from: string, to: string): Promise<HistoryOutput> {
		return this.shiftAssignmentService.getEmployeeHistory(employeeId, from, to);
	}

	/** Управлять сменой может её владелец либо администратор. */
	private async assertCanManage(user: AuthUser, sessionId: string): Promise<SessionContext> {
		const context = await this.repository.findContextBySessionId(sessionId);
		if (!context) {
			throw new NotFoundException('Смена не найдена');
		}
		if (user.role !== 'admin' && context.employeeId !== user.id) {
			throw new ForbiddenException('Нельзя управлять чужой сменой');
		}
		return context;
	}
}

function parseDate(value: string, label: string): Date {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new BadRequestException(`Некорректное время ${label}`);
	}
	return date;
}
