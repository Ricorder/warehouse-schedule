import type { Metadata } from 'next';
import { AdminLogPage } from '@/views';

export const metadata: Metadata = {
	title: 'Журнал действий | Учёт рабочего времени',
	description: 'Кто, когда и где работал: старты, паузы, комментарии и правки администратора',
};

export default function Page() {
	return <AdminLogPage />;
}
