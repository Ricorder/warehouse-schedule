import type { Metadata } from 'next';
import { LoginPage } from '@/views';

export const metadata: Metadata = {
	title: 'Вход | Учёт рабочего времени',
	description: 'Вход в систему учёта рабочего времени',
};

export default function Page() {
	return <LoginPage />;
}
