import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ActivityLogService } from '../activity-log/activity-log.service';
import type { AuthUser } from '../configs/trpc/context.interface';
import { PauseRepository } from './pause.repository';
import { PauseService } from './pause.service';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const OWNER: AuthUser = { id: '22222222-2222-4222-8222-222222222222', name: 'Клавдия', role: 'worker' };
const STRANGER: AuthUser = { id: '33333333-3333-4333-8333-333333333333', name: 'Пётр', role: 'worker' };
const ADMIN: AuthUser = { id: '44444444-4444-4444-8444-444444444444', name: 'Ольга', role: 'admin' };

describe('PauseService', () => {
	let service: PauseService;
	let repo: jest.Mocked<PauseRepository>;
	let activityLog: jest.Mocked<ActivityLogService>;

	beforeEach(async () => {
		repo = {
			findSessionOwnership: jest
				.fn()
				.mockResolvedValue({ sessionId: SESSION_ID, employeeId: OWNER.id, stoppedAt: null }),
			findActiveBySession: jest.fn().mockResolvedValue(undefined),
			create: jest.fn().mockImplementation(async (data) => ({
				id: '55555555-5555-4555-8555-555555555555',
				endedAt: null,
				...data,
			})),
			findById: jest.fn(),
			update: jest.fn(),
			findBySessionId: jest.fn().mockResolvedValue([]),
		} as unknown as jest.Mocked<PauseRepository>;

		activityLog = { log: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<ActivityLogService>;

		const moduleRef = await Test.createTestingModule({
			providers: [
				PauseService,
				{ provide: PauseRepository, useValue: repo },
				{ provide: ActivityLogService, useValue: activityLog },
			],
		}).compile();

		service = moduleRef.get(PauseService);
	});

	it('ставит паузу с причиной и пишет её в журнал', async () => {
		const pause = await service.startPause(OWNER, SESSION_ID, 'Курить');
		expect(pause.reason).toBe('Курить');
		expect(pause.isProductive).toBe(false);
		expect(activityLog.log).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'pause', sessionId: SESSION_ID }),
		);
	});

	it('помечает «Вызвали помочь» как продуктивную независимо от клиента', async () => {
		const pause = await service.startPause(OWNER, SESSION_ID, 'Вызвали помочь', false);
		expect(pause.isProductive).toBe(true);
	});

	it('не даёт поставить вторую паузу поверх активной', async () => {
		repo.findActiveBySession.mockResolvedValue({
			id: 'active',
			sessionId: SESSION_ID,
			startedAt: new Date(),
			endedAt: null,
			reason: 'Обед',
			isProductive: false,
		});
		await expect(service.startPause(OWNER, SESSION_ID, 'Курить')).rejects.toThrow(BadRequestException);
	});

	it('не даёт поставить паузу на завершённую смену', async () => {
		repo.findSessionOwnership.mockResolvedValue({
			sessionId: SESSION_ID,
			employeeId: OWNER.id,
			stoppedAt: new Date(),
		});
		await expect(service.startPause(OWNER, SESSION_ID, 'Курить')).rejects.toThrow(/завершена/);
	});

	it('запрещает ставить паузу на чужую смену', async () => {
		await expect(service.startPause(STRANGER, SESSION_ID, 'Курить')).rejects.toThrow(ForbiddenException);
	});

	it('разрешает администратору управлять чужой сменой', async () => {
		await expect(service.startPause(ADMIN, SESSION_ID, 'Курить')).resolves.toBeDefined();
	});

	it('сообщает, если смена не найдена', async () => {
		repo.findSessionOwnership.mockResolvedValue(undefined);
		await expect(service.startPause(OWNER, SESSION_ID, 'Курить')).rejects.toThrow(NotFoundException);
	});

	it('закрывает паузу и логирует её длительность', async () => {
		const startedAt = new Date('2025-07-16T10:00:00.000Z');
		const endedAt = new Date('2025-07-16T10:10:00.000Z');
		repo.findById.mockResolvedValue({
			id: 'p1',
			sessionId: SESSION_ID,
			startedAt,
			endedAt: null,
			reason: 'Курить',
			isProductive: false,
		});
		repo.update.mockResolvedValue({
			id: 'p1',
			sessionId: SESSION_ID,
			startedAt,
			endedAt,
			reason: 'Курить',
			isProductive: false,
		});

		await service.endPause(OWNER, 'p1');
		expect(activityLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'resume',
				details: expect.objectContaining({ durationMs: 600_000 }),
			}),
		);
	});

	it('не закрывает уже закрытую паузу', async () => {
		repo.findById.mockResolvedValue({
			id: 'p1',
			sessionId: SESSION_ID,
			startedAt: new Date(),
			endedAt: new Date(),
			reason: 'Обед',
			isProductive: false,
		});
		await expect(service.endPause(OWNER, 'p1')).rejects.toThrow(BadRequestException);
	});
});
