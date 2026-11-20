import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { DrizzleDB } from '../configs/db/drizzle';
import { DrizzleAsyncProvider } from '../configs/db/drizzle.provider';
import { type InsertMachine, machines, type SelectMachine } from '../configs/db/schema';
import type { MachineType } from './dto/machine';

@Injectable()
export class MachineRepository {
	constructor(@Inject(DrizzleAsyncProvider) private readonly db: DrizzleDB) {}

	async findAll(type?: MachineType): Promise<SelectMachine[]> {
		const query = this.db.select().from(machines);
		const filtered = type ? query.where(eq(machines.type, type)) : query;
		return filtered.orderBy(asc(machines.name));
	}

	async findById(id: string): Promise<SelectMachine | undefined> {
		const [machine] = await this.db.select().from(machines).where(eq(machines.id, id)).limit(1);
		return machine;
	}

	async create(data: InsertMachine): Promise<SelectMachine> {
		const [machine] = await this.db.insert(machines).values(data).returning();
		return machine;
	}
}
