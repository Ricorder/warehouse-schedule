import type { Metadata } from 'next';
import { HistoryPage } from '@/views';

export const metadata: Metadata = {
	title: 'История смен | Учёт рабочего времени',
	description: 'Просмотр собственных смен и отработанного времени',
};

export default function Page() {
	return <HistoryPage />;
}
