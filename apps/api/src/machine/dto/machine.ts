import { z } from 'zod';

export const machineType = z.enum(['machine', 'table']);

export const machineOutput = z.object({
	id: z.uuid(),
	name: z.string(),
	type: z.enum(['machine', 'table']),
});

export const machineList = z.array(machineOutput);

export const getMachinesInput = z.object({
	type: z.enum(['machine', 'table']).optional(),
});

export const createMachineInput = z.object({
	name: z.string().min(1, 'Название обязательно').max(255),
	type: z.enum(['machine', 'table']),
});

export type MachineType = z.infer<typeof machineType>;
export type MachineOutput = z.infer<typeof machineOutput>;
export type MachineList = z.infer<typeof machineList>;
export type GetMachinesInput = z.infer<typeof getMachinesInput>;
export type CreateMachineInput = z.infer<typeof createMachineInput>;
