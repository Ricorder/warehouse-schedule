import { Injectable, NotFoundException } from '@nestjs/common';
import type { SelectMachine } from '../configs/db/schema';
import type { CreateMachineInput, MachineType } from './dto/machine';
import { MachineRepository } from './machine.repository';

@Injectable()
export class MachineService {
	constructor(private readonly machineRepository: MachineRepository) {}

	async findAll(type?: MachineType): Promise<SelectMachine[]> {
		return this.machineRepository.findAll(type);
	}

	async findById(id: string): Promise<SelectMachine> {
		const machine = await this.machineRepository.findById(id);
		if (!machine) {
			throw new NotFoundException(`Станок/стол с ID ${id} не найден`);
		}
		return machine;
	}

	async create(input: CreateMachineInput): Promise<SelectMachine> {
		return this.machineRepository.create({ name: input.name.trim(), type: input.type });
	}
}
