/**
 * Демо-данные: станки/столы, сотрудники, расписание на текущую неделю
 * и несколько смен с паузами, чтобы интерфейс открывался не пустым.
 *
 * Запуск: pnpm --filter api db:seed
 */
import 'dotenv/config';
import { hash } from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
	activityLogs,
	employees,
	machines,
	pauses,
	shiftAssignments,
	workSessions,
} from './schema';

const DEMO_PASSWORD = 'password123';
const BCRYPT_ROUNDS = 10;

const MACHINES = [
	{ name: 'Станок 1', type: 'machine' as const },
	{ name: 'Станок 2', type: 'machine' as const },
	{ name: 'Станок 3', type: 'machine' as const },
	{ name: 'Станок 4', type: 'machine' as const },
	{ name: 'Стол 1', type: 'table' as const },
	{ name: 'Стол 2', type: 'table' as const },
];

const PEOPLE = [
	{ name: 'Ольга Смирнова', email: 'admin@warehouse.local', role: 'admin' as const },
	{ name: 'Клавдия Петрова', email: 'klavdiya@warehouse.local', role: 'worker' as const },
	{ name: 'Анатолий Гусев', email: 'anatoly@warehouse.local', role: 'worker' as const },
	{ name: 'Анвар Рахимов', email: 'anvar@warehouse.local', role: 'worker' as const },
	{ name: 'Пётр Иванов', email: 'petr@warehouse.local', role: 'worker' as const },
	{ name: 'Алексей Сидоров', email: 'alexey@warehouse.local', role: 'worker' as const },
	{ name: 'Марина Ковалёва', email: 'marina@warehouse.local', role: 'worker' as const },
	{ name: 'Дмитрий Орлов', email: 'dmitry@warehouse.local', role: 'worker' as const },
];

function toDateString(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Понедельник недели, в которую попадает `date`. */
function startOfWeek(date: Date): Date {
	const result = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const weekday = (result.getUTCDay() + 6) % 7; // 0 = понедельник
	result.setUTCDate(result.getUTCDate() - weekday);
	return result;
}

function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setUTCDate(result.getUTCDate() + days);
	return result;
}

/** Локальное время `hours:minutes` для указанной даты смены. */
function atLocalTime(dateStr: string, hours: number, minutes = 0): Date {
	const [year, month, day] = dateStr.split('-').map(Number);
	return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

async function main() {
	const databaseUrl = process.env.DB_URL;
	if (!databaseUrl) {
		throw new Error('DB_URL не задан — проверьте apps/api/.env');
	}

	const pool = new Pool({ connectionString: databaseUrl });
	const db = drizzle(pool);

	try {
		console.log('🌱 Очищаю таблицы...');
		// Порядок важен: внешние ключи каскадные, но чистим явно.
		await db.delete(activityLogs);
		await db.delete(pauses);
		await db.delete(workSessions);
		await db.delete(shiftAssignments);
		await db.delete(employees);
		await db.delete(machines);

		console.log('🏭 Создаю станки и столы...');
		const insertedMachines = await db.insert(machines).values(MACHINES).returning();
		const machineByName = new Map(insertedMachines.map((m) => [m.name, m]));

		console.log('👷 Создаю сотрудников...');
		const passwordHash = await hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
		const insertedEmployees = await db
			.insert(employees)
			.values(PEOPLE.map((person) => ({ ...person, password: passwordHash })))
			.returning();
		const employeeByEmail = new Map(insertedEmployees.map((e) => [e.email, e]));

		const admin = employeeByEmail.get('admin@warehouse.local')!;

		console.log('📅 Раскладываю расписание на текущую неделю...');
		const monday = startOfWeek(new Date());
		const weekDates = Array.from({ length: 7 }, (_, i) => toDateString(addDays(monday, i)));
		const today = toDateString(new Date());

		// Дневная смена: 4 человека на «Станок 1», 2 на «Станок 2», 2 на «Стол 1».
		const dayPlan: Array<{ machine: string; emails: string[] }> = [
			{
				machine: 'Станок 1',
				emails: [
					'klavdiya@warehouse.local',
					'anatoly@warehouse.local',
					'anvar@warehouse.local',
					'petr@warehouse.local',
				],
			},
			{ machine: 'Станок 2', emails: ['alexey@warehouse.local', 'marina@warehouse.local'] },
			{ machine: 'Стол 1', emails: ['dmitry@warehouse.local'] },
		];
		// Ночная смена: меньше людей и другой состав.
		const nightPlan: Array<{ machine: string; emails: string[] }> = [
			{ machine: 'Станок 3', emails: ['alexey@warehouse.local', 'dmitry@warehouse.local'] },
		];

		const assignmentRows: Array<{
			employeeId: string;
			machineId: string;
			shiftDate: string;
			shiftType: 'day' | 'night';
		}> = [];

		for (const shiftDate of weekDates.slice(0, 5)) {
			for (const { machine, emails } of dayPlan) {
				for (const email of emails) {
					assignmentRows.push({
						employeeId: employeeByEmail.get(email)!.id,
						machineId: machineByName.get(machine)!.id,
						shiftDate,
						shiftType: 'day',
					});
				}
			}
			// Ночная смена начинается там, где сотрудник не занят днём.
			for (const { machine, emails } of nightPlan) {
				for (const email of emails) {
					assignmentRows.push({
						employeeId: employeeByEmail.get(email)!.id,
						machineId: machineByName.get(machine)!.id,
						shiftDate,
						shiftType: 'night',
					});
				}
			}
		}

		const insertedAssignments = await db.insert(shiftAssignments).values(assignmentRows).returning();
		const assignmentKey = (employeeId: string, shiftDate: string, shiftType: string) =>
			`${employeeId}|${shiftDate}|${shiftType}`;
		const assignmentIndex = new Map(
			insertedAssignments.map((a) => [assignmentKey(a.employeeId, a.shiftDate, a.shiftType), a]),
		);

		console.log('⏱  Заполняю смены, паузы и журнал...');
		const pastDates = weekDates.slice(0, 5).filter((d) => d < today);

		type LogRow = typeof activityLogs.$inferInsert;
		const logRows: LogRow[] = [];

		// Завершённые смены за прошедшие дни недели.
		for (const shiftDate of pastDates) {
			for (const { emails } of dayPlan) {
				for (const email of emails) {
					const employee = employeeByEmail.get(email)!;
					const assignment = assignmentIndex.get(assignmentKey(employee.id, shiftDate, 'day'));
					if (!assignment) continue;

					const startedAt = atLocalTime(shiftDate, 8);
					const stoppedAt = atLocalTime(shiftDate, 17);
					const [session] = await db
						.insert(workSessions)
						.values({ assignmentId: assignment.id, startedAt, stoppedAt })
						.returning();

					const lunchStart = atLocalTime(shiftDate, 12);
					const lunchEnd = atLocalTime(shiftDate, 12, 45);
					await db.insert(pauses).values({
						sessionId: session.id,
						startedAt: lunchStart,
						endedAt: lunchEnd,
						reason: 'Обед',
						isProductive: false,
					});

					logRows.push(
						{
							userId: employee.id,
							targetEmployeeId: employee.id,
							sessionId: session.id,
							assignmentId: assignment.id,
							action: 'start',
							timestamp: startedAt,
						},
						{
							userId: employee.id,
							targetEmployeeId: employee.id,
							sessionId: session.id,
							assignmentId: assignment.id,
							action: 'pause',
							timestamp: lunchStart,
							details: JSON.stringify({ reason: 'Обед', isProductive: false }),
						},
						{
							userId: employee.id,
							targetEmployeeId: employee.id,
							sessionId: session.id,
							assignmentId: assignment.id,
							action: 'resume',
							timestamp: lunchEnd,
							details: JSON.stringify({ reason: 'Обед', durationMs: 45 * 60_000 }),
						},
						{
							userId: employee.id,
							targetEmployeeId: employee.id,
							sessionId: session.id,
							assignmentId: assignment.id,
							action: 'stop',
							timestamp: stoppedAt,
							details: JSON.stringify({
								workMs: 8 * 3_600_000 + 15 * 60_000,
								pauseMs: 45 * 60_000,
								totalMs: 9 * 3_600_000,
							}),
						},
					);
				}
			}
		}

		// Сегодняшний день: разные статусы, чтобы в таблице были видны ▸, ⏸ и ■.
		const todayScenarios: Array<{ email: string; kind: 'working' | 'paused' | 'stopped' }> = [
			{ email: 'klavdiya@warehouse.local', kind: 'working' },
			{ email: 'anatoly@warehouse.local', kind: 'paused' },
			{ email: 'anvar@warehouse.local', kind: 'stopped' },
		];

		if (weekDates.slice(0, 5).includes(today)) {
			const now = new Date();
			for (const { email, kind } of todayScenarios) {
				const employee = employeeByEmail.get(email)!;
				const assignment = assignmentIndex.get(assignmentKey(employee.id, today, 'day'));
				if (!assignment) continue;

				const startedAt = new Date(now.getTime() - 4 * 3_600_000);
				const stoppedAt = kind === 'stopped' ? new Date(now.getTime() - 30 * 60_000) : null;
				const [session] = await db
					.insert(workSessions)
					.values({ assignmentId: assignment.id, startedAt, stoppedAt })
					.returning();

				logRows.push({
					userId: employee.id,
					targetEmployeeId: employee.id,
					sessionId: session.id,
					assignmentId: assignment.id,
					action: 'start',
					timestamp: startedAt,
				});

				if (kind === 'paused') {
					const pauseStart = new Date(now.getTime() - 10 * 60_000);
					await db.insert(pauses).values({
						sessionId: session.id,
						startedAt: pauseStart,
						endedAt: null,
						reason: 'Курить',
						isProductive: false,
					});
					logRows.push({
						userId: employee.id,
						targetEmployeeId: employee.id,
						sessionId: session.id,
						assignmentId: assignment.id,
						action: 'pause',
						timestamp: pauseStart,
						details: JSON.stringify({ reason: 'Курить', isProductive: false }),
					});
				}

				if (kind === 'working') {
					// Продуктивная пауза: время засчитывается в рабочее.
					const helpStart = new Date(now.getTime() - 90 * 60_000);
					const helpEnd = new Date(now.getTime() - 60 * 60_000);
					await db.insert(pauses).values({
						sessionId: session.id,
						startedAt: helpStart,
						endedAt: helpEnd,
						reason: 'Вызвали помочь',
						isProductive: true,
					});
					logRows.push(
						{
							userId: employee.id,
							targetEmployeeId: employee.id,
							sessionId: session.id,
							assignmentId: assignment.id,
							action: 'pause',
							timestamp: helpStart,
							details: JSON.stringify({ reason: 'Вызвали помочь', isProductive: true }),
						},
						{
							userId: employee.id,
							targetEmployeeId: employee.id,
							sessionId: session.id,
							assignmentId: assignment.id,
							action: 'resume',
							timestamp: helpEnd,
							details: JSON.stringify({ reason: 'Вызвали помочь', durationMs: 30 * 60_000 }),
						},
						{
							userId: employee.id,
							targetEmployeeId: employee.id,
							sessionId: session.id,
							assignmentId: assignment.id,
							action: 'comment',
							timestamp: helpEnd,
							details: JSON.stringify({ comment: 'Помогал на складе распределения' }),
						},
					);
				}

				if (stoppedAt) {
					logRows.push({
						userId: employee.id,
						targetEmployeeId: employee.id,
						sessionId: session.id,
						assignmentId: assignment.id,
						action: 'stop',
						timestamp: stoppedAt,
						details: JSON.stringify({
							workMs: 3.5 * 3_600_000,
							pauseMs: 0,
							totalMs: 3.5 * 3_600_000,
						}),
					});
				}
			}
		}

		// Журналируем сами назначения — как будто их расставил администратор.
		for (const assignment of insertedAssignments) {
			const machine = insertedMachines.find((m) => m.id === assignment.machineId)!;
			logRows.push({
				userId: admin.id,
				targetEmployeeId: assignment.employeeId,
				assignmentId: assignment.id,
				action: 'admin_assign',
				timestamp: assignment.createdAt,
				details: JSON.stringify({
					machineName: machine.name,
					shiftDate: assignment.shiftDate,
					shiftType: assignment.shiftType,
				}),
			});
		}

		await db.insert(activityLogs).values(logRows);

		console.log('\n✅ Готово.');
		console.log(`   станков/столов: ${insertedMachines.length}`);
		console.log(`   сотрудников:    ${insertedEmployees.length} (админ: ${admin.email})`);
		console.log(`   назначений:     ${insertedAssignments.length}`);
		console.log(`   записей журнала: ${logRows.length}`);
		console.log(`\n   Неделя: ${weekDates[0]} — ${weekDates[6]}`);
		console.log(`   Пароль у всех: ${DEMO_PASSWORD}`);
		console.log(`   Вход админом:  admin@warehouse.local`);
		console.log(`   Вход рабочим:  klavdiya@warehouse.local\n`);
	} catch (error) {
		console.error('❌ Ошибка при посеве данных:', error instanceof Error ? error.message : error);
		process.exitCode = 1;
	} finally {
		await pool.end();
	}
}

void main();
