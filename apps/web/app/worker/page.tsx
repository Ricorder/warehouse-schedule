import type { Metadata } from 'next';
import { WorkerPage } from '@/views';

export const metadata: Metadata = {
	title: 'Моя смена | Учёт рабочего времени',
	description: 'Старт и остановка смены, паузы с комментариями, учёт времени',
};

export default function Page() {
	return <WorkerPage />;
}
