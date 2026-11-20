'use client';
import { type FormEvent, useState } from 'react';
import { useAddComment } from '@/entities';
import { Button, ErrorMessage, Field, Input, Modal } from '@/shared';

export function CommentDialog({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
	const addComment = useAddComment();
	const [comment, setComment] = useState('');
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (!comment.trim()) {
			setError('Комментарий не может быть пустым');
			return;
		}
		setError(null);
		try {
			await addComment.mutateAsync({ sessionId, comment: comment.trim() });
			onClose();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Не удалось сохранить комментарий');
		}
	};

	return (
		<Modal title="Добавить комментарий" onClose={onClose}>
			<form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
				<Field label="Комментарий к смене" htmlFor="shift-comment">
					<Input
						id="shift-comment"
						value={comment}
						maxLength={500}
						placeholder="Например: помогал на складе распределения"
						onChange={(event) => setComment(event.target.value)}
						autoFocus
					/>
				</Field>
				{error && <ErrorMessage>{error}</ErrorMessage>}
				<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
					<Button variant="ghost" onClick={onClose}>
						Отмена
					</Button>
					<Button type="submit" variant="primary" loading={addComment.isPending}>
						Сохранить
					</Button>
				</div>
			</form>
		</Modal>
	);
}
