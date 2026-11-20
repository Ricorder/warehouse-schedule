import type { Metadata } from 'next';
import { RegisterPage } from '@/views';

export const metadata: Metadata = {
	title: 'Регистрация | Учёт рабочего времени',
	description: 'Создание учётной записи сотрудника склада',
};

export default function Page() {
	return <RegisterPage />;
}
