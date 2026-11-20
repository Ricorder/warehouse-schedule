import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from './@generated/server';

/** Типы ответов сервера — источник правды для пропсов виджетов. */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;

export type CurrentShift = NonNullable<RouterOutputs['session']['getCurrent']>;
export type Schedule = RouterOutputs['shift']['getSchedule'];
export type ScheduleRow = Schedule['rows'][number];
export type ScheduleEntry = ScheduleRow['cells'][number]['entries'][number];
export type EmployeeTotal = Schedule['totals'][number];
export type ActivityLogEntry = RouterOutputs['log']['getLogs'][number];
export type ShiftHistory = RouterOutputs['session']['getMyHistory'];
