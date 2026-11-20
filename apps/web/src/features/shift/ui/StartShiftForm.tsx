'use client';
import { useMemo, useState } from 'react';
import { useMachines, useStartSession } from '@/entities';
import { Button, ErrorMessage, Field, Select } from '@/shared';
import type { MachineType, ShiftType } from '@/shared';
import s from './shift.module.scss';

/** ТЗ: «Каждый сотрудник при входе выбирает станок или стол и смену». */
export function StartShiftForm({ defaultShift }: { defaultShift: ShiftType }) {
	const [machineType, setMachineType] = useState<MachineType>('machine');
	const [machineId, setMachineId] = useState('');
	const [shiftType, setShiftType] = useState<ShiftType>(defaultShift);
	const [error, setError] = useState<string | null>(null);

	const { data: machines = [], isPending } = useMachines(machineType);
	const startSession = useStartSession();

	const selected = useMemo(
		() => machines.find((machine) => machine.id === machineId) ?? null,
		[machines, machineId],
	);

	const handleStart = async () => {
		if (!selected) {
			setError('Выберите рабочее место');
			return;
		}
		setError(null);
		try {
			await startSession.mutateAsync({ machineId: selected.id, shiftType });
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось начать смену');
		}
	};

	return (
		<div>
			<div className={s.startForm}>
				<Field label="Тип рабочего места" htmlFor="machine-type">
					<Select
						id="machine-type"
						value={machineType}
						onChange={(event) => {
							setMachineType(event.target.value as MachineType);
							setMachineId('');
						}}
					>
						<option value="machine">Станки</option>
						<option value="table">Столы</option>
					</Select>
				</Field>

				<Field label={machineType === 'machine' ? 'Станок' : 'Стол'} htmlFor="machine">
					<Select
						id="machine"
						value={machineId}
						disabled={isPending}
						onChange={(event) => setMachineId(event.target.value)}
					>
						<option value="">— выберите —</option>
						{machines.map((machine) => (
							<option key={machine.id} value={machine.id}>
								{machine.name}
							</option>
						))}
					</Select>
				</Field>

				<Field label="Смена" htmlFor="shift">
					<Select
						id="shift"
						value={shiftType}
						onChange={(event) => setShiftType(event.target.value as ShiftType)}
					>
						<option value="day">День</option>
						<option value="night">Ночь</option>
					</Select>
				</Field>

				<Button variant="primary" onClick={handleStart} loading={startSession.isPending}>
					▶ Начать работу
				</Button>
			</div>
			{error && (
				<div style={{ marginTop: 14 }}>
					<ErrorMessage>{error}</ErrorMessage>
				</div>
			)}
		</div>
	);
}
