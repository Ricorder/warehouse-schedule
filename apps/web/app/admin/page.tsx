import type { Metadata } from 'next';
import { AdminSchedulePage } from '@/views';

export const metadata: Metadata = {
	title: 'Расписание | Учёт рабочего времени',
	description: 'Распределение сотрудников по станкам и сменам на неделю',
};

export default function Page() {
	return <AdminSchedulePage />;
}
