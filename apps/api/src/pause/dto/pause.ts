import { z } from 'zod';

export const startPauseInput = z.object({
	sessionId: z.uuid(),
	/** ТЗ: «Сотрудник может поставить себя на паузу только с комментарием». */
	reason: z.string().min(1, 'Укажите причину паузы').max(255),
	/** Продуктивная пауза («вызвали помочь») засчитывается в рабочее время. */
	isProductive: z.boolean().optional(),
});

export const endPauseInput = z.object({
	pauseId: z.uuid(),
});

export const pauseOutput = z.object({
	id: z.uuid(),
	sessionId: z.uuid(),
	startedAt: z.string(),
	endedAt: z.string().nullable(),
	reason: z.string(),
	isProductive: z.boolean(),
});

export const pauseList = z.array(pauseOutput);

export const pausePreset = z.object({
	reason: z.string(),
	isProductive: z.boolean(),
});

export const pausePresetList = z.array(pausePreset);

export type StartPauseInput = z.infer<typeof startPauseInput>;
export type EndPauseInput = z.infer<typeof endPauseInput>;
export type PauseOutput = z.infer<typeof pauseOutput>;
export type PauseList = z.infer<typeof pauseList>;
export type PausePresetList = z.infer<typeof pausePresetList>;
