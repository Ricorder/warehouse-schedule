import { HttpException } from '@nestjs/common';
import { TRPCError, type TRPC_ERROR_CODE_KEY } from '@trpc/server';

const STATUS_TO_TRPC_CODE: Record<number, TRPC_ERROR_CODE_KEY> = {
	400: 'BAD_REQUEST',
	401: 'UNAUTHORIZED',
	403: 'FORBIDDEN',
	404: 'NOT_FOUND',
	409: 'CONFLICT',
	422: 'UNPROCESSABLE_CONTENT',
};

/**
 * Переводит доменные исключения NestJS в ошибки tRPC,
 * сохраняя человекочитаемое сообщение для интерфейса.
 */
export function toTRPCError(error: unknown, fallbackMessage: string): TRPCError {
	if (error instanceof TRPCError) return error;
	if (error instanceof HttpException) {
		return new TRPCError({
			code: STATUS_TO_TRPC_CODE[error.getStatus()] ?? 'INTERNAL_SERVER_ERROR',
			message: error.message,
			cause: error,
		});
	}
	return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: fallbackMessage, cause: error });
}
