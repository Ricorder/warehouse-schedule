import { TRPCError } from '@trpc/server';
import { Ctx, Input, Mutation, Query, Router } from 'nestjs-trpc-v2';
import { requireAdmin, requireUser } from '../common/auth.util';
import type { TRPCContextShape } from '../configs/trpc/context.interface';
import {
	type CreateMachineInput,
	createMachineInput,
	type GetMachinesInput,
	getMachinesInput,
	type MachineList,
	machineList,
	type MachineOutput,
	machineOutput,
} from './dto/machine';
import { MachineService } from './machine.service';

@Router({ alias: 'machine' })
export class MachineRouter {
	constructor(private readonly machineService: MachineService) {}

	@Query({ input: getMachinesInput, output: machineList })
	async getMachines(@Input() input: GetMachinesInput, @Ctx() ctx: TRPCContextShape): Promise<MachineList> {
		requireUser(ctx);
		return this.machineService.findAll(input.type);
	}

	@Mutation({ input: createMachineInput, output: machineOutput })
	async createMachine(@Input() input: CreateMachineInput, @Ctx() ctx: TRPCContextShape): Promise<MachineOutput> {
		requireAdmin(ctx);
		try {
			return await this.machineService.create(input);
		} catch {
			throw new TRPCError({ code: 'CONFLICT', message: 'Станок или стол с таким названием уже существует' });
		}
	}
}
