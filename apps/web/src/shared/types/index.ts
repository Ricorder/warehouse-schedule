export type ShiftType = 'day' | 'night';
export type MachineType = 'machine' | 'table';
export type UserRole = 'admin' | 'worker';
/** Статус сотрудника в расписании: ▸ работает, ⏸ пауза, ■ смена остановлена. */
export type SessionStatus = 'idle' | 'working' | 'paused' | 'stopped';
