'use client';
import { useCurrentShift } from '@/entities';
import { RequireRole } from '@/features';
import { ErrorMessage, Loading } from '@/shared';
import { AppShell, ShiftTimer } from '@/widgets';

export function WorkerPage() {
	return (
		<RequireRole role="worker">
			<AppShell>
				<WorkerShift />
			</AppShell>
		</RequireRole>
	);
}

function WorkerShift() {
	const { data, isPending, isError, error, dataUpdatedAt } = useCurrentShift();

	if (isPending) return <Loading label="Загружаем смену…" />;
	if (isError) return <ErrorMessage>{error.message}</ErrorMessage>;

	// Часы клиента могут отличаться от серверных — компенсируем разницу,
	// чтобы таймер показывал то же, что и отчёты администратора.
	const clockSkewMs = data ? Date.parse(data.serverTime) - dataUpdatedAt : 0;
	const defaultShiftType = new Date().getHours() >= 8 && new Date().getHours() < 20 ? 'day' : 'night';

	return <ShiftTimer shift={data ?? null} clockSkewMs={clockSkewMs} defaultShiftType={defaultShiftType} />;
}
