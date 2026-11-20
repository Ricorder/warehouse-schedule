import { Module } from '@nestjs/common';
import { MachineRouter } from './machine.controller';
import { MachineRepository } from './machine.repository';
import { MachineService } from './machine.service';

@Module({
	providers: [MachineRouter, MachineService, MachineRepository],
	exports: [MachineService],
})
export class MachineModule {}
