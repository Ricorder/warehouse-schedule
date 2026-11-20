'use client';
import { useEffect } from 'react';
import { Button, Card, CardBody, ErrorMessage } from '@/shared';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
			<Card>
				<CardBody>
					<h1 style={{ marginBottom: 12 }}>Что-то пошло не так</h1>
					<ErrorMessage>{error.message || 'Неизвестная ошибка'}</ErrorMessage>
					<div style={{ marginTop: 16 }}>
						<Button variant="primary" onClick={reset}>
							Попробовать снова
						</Button>
					</div>
				</CardBody>
			</Card>
		</div>
	);
}
