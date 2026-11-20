import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { MachineService } from '../machine/machine.service';
import { ShiftAssignmentRepository } from './shift-assignment.repository';
import { ShiftAssignmentService } from './shift-assignment.service';

const DATE = '2025-07-16';
const EMPLOYEE_ID = '11111111-1111-4111-8111-111111111111';
const MACHINE_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_MACHINE_ID = '33333333-3333-4333-8333-333333333333';
const ADMIN_ID = '44444444-4444-4444-8444-444444444444';

describe('ShiftAssignmentService — бизнес-правила назначения', () => {
	let service: ShiftAssignmentService;
	let repo: jest.Mocked<ShiftAssignmentRepository>;
	let machineService: jest.Mocked<MachineService>;
	let activityLog: jest.Mocked<ActivityLogService>;

	beforeEach(async () => {
		repo = {
			findByEmployeeAndShift: jest.fn().mockResolvedValue(undefined),
			countOnMachine: jest.fn().mockResolvedValue(0),
			create: jest.fn().mockImplementation(async (data) => ({
				id: '55555555-5555-4555-8555-555555555555',
				createdAt: new Date('2025-07-16T07:00:00.000Z'),
				...data,
			})),
			findById: jest.fn(),
			delete: jest.fn(),
		} as unknown as jest.Mocked<ShiftAssignmentRepository>;

		machineService = {
			findById: jest.fn().mockResolvedValue({ id: MACHINE_ID, name: 'Станок 1', type: 'machine' }),
			findAll: jest.fn().mockResolvedValue([]),
		} as unknown as jest.Mocked<MachineService>;

		activityLog = { log: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<ActivityLogService>;

		const moduleRef = await Test.createTestingModule({
			providers: [
				ShiftAssignmentService,
				{ provide: ShiftAssignmentRepository, useValue: repo },
				{ provide: MachineService, useValue: machineService },
				{ provide: ActivityLogService, useValue: activityLog },
			],
		}).compile();

		service = moduleRef.get(ShiftAssignmentService);
	});

	it('назначает сотрудника, когда ограничения не нарушены', async () => {
		const assignment = await service.createAssignment(EMPLOYEE_ID, MACHINE_ID, DATE, 'day');
		expect(assignment.machineId).toBe(MACHINE_ID);
		expect(repo.create).toHaveBeenCalledWith({
			employeeId: EMPLOYEE_ID,
			machineId: MACHINE_ID,
			shiftDate: DATE,
			shiftType: 'day',
		});
	});

	it('отклоняет седьмого сотрудника на станке', async () => {
		repo.countOnMachine.mockResolvedValue(6);
		await expect(service.createAssignment(EMPLOYEE_ID, MACHINE_ID, DATE, 'day')).rejects.toThrow(
			BadRequestException,
		);
		expect(repo.create).not.toHaveBeenCalled();
	});

	it('пропускает шестого сотрудника — граница лимита не срабатывает раньше времени', async () => {
		repo.countOnMachine.mockResolvedValue(5);
		await expect(service.createAssignment(EMPLOYEE_ID, MACHINE_ID, DATE, 'day')).resolves.toBeDefined();
	});

	it('запрещает назначение на второй станок в ту же смену', async () => {
		repo.findByEmployeeAndShift.mockResolvedValue({
			id: 'existing',
			employeeId: EMPLOYEE_ID,
			machineId: OTHER_MACHINE_ID,
			shiftDate: DATE,
			shiftType: 'day',
			createdAt: new Date(),
		});
		machineService.findById.mockResolvedValue({ id: OTHER_MACHINE_ID, name: 'Станок 3', type: 'machine' });

		await expect(service.createAssignment(EMPLOYEE_ID, MACHINE_ID, DATE, 'day')).rejects.toThrow(
			/уже занят в эту смену на «Станок 3»/,
		);
	});

	it('разрешает работу в другую смену того же дня', async () => {
		repo.findByEmployeeAndShift.mockImplementation(async (_id, _date, shift) =>
			shift === 'day'
				? {
						id: 'existing',
						employeeId: EMPLOYEE_ID,
						machineId: OTHER_MACHINE_ID,
						shiftDate: DATE,
						shiftType: 'day',
						createdAt: new Date(),
					}
				: undefined,
		);
		await expect(service.createAssignment(EMPLOYEE_ID, MACHINE_ID, DATE, 'night')).resolves.toBeDefined();
	});

	it('сообщает отдельно о повторном назначении на тот же станок', async () => {
		repo.findByEmployeeAndShift.mockResolvedValue({
			id: 'existing',
			employeeId: EMPLOYEE_ID,
			machineId: MACHINE_ID,
			shiftDate: DATE,
			shiftType: 'day',
			createdAt: new Date(),
		});
		await expect(service.createAssignment(EMPLOYEE_ID, MACHINE_ID, DATE, 'day')).rejects.toThrow(
			ConflictException,
		);
	});

	it('записывает назначение администратора в журнал', async () => {
		await service.assignEmployee(ADMIN_ID, EMPLOYEE_ID, MACHINE_ID, DATE, 'day');
		expect(activityLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: ADMIN_ID,
				targetEmployeeId: EMPLOYEE_ID,
				action: 'admin_assign',
			}),
		);
	});

	it('журналирует снятие со смены до удаления записи', async () => {
		repo.findById.mockResolvedValue({
			id: 'existing',
			employeeId: EMPLOYEE_ID,
			machineId: MACHINE_ID,
			shiftDate: DATE,
			shiftType: 'day',
			createdAt: new Date(),
		});
		await service.unassignEmployee(ADMIN_ID, 'existing');
		expect(activityLog.log).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'admin_unassign', targetEmployeeId: EMPLOYEE_ID }),
		);
		expect(repo.delete).toHaveBeenCalledWith('existing');
	});
});
