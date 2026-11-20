import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { AuthModule } from './auth/auth.module';
import { DrizzleModule } from './configs/db/drizzle.module';
import { TrpcModule } from './configs/trpc/trpc.module';
import { EmployeeModule } from './employee/employee.module';
import { MachineModule } from './machine/machine.module';
import { PauseModule } from './pause/pause.module';
import { ShiftAssignmentModule } from './shift-assignment/shift-assignment.module';
import { WorkSessionModule } from './work-session/work-session.module';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
		DrizzleModule,
		AuthModule,
		TrpcModule,
		EmployeeModule,
		MachineModule,
		ActivityLogModule,
		PauseModule,
		ShiftAssignmentModule,
		WorkSessionModule,
	],
})
export class AppModule {}
