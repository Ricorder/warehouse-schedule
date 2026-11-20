/** ТЗ: «Максимальное количество сотрудников на одном станке — 6». */
export const MAX_EMPLOYEES_PER_MACHINE = 6;

/**
 * Типовые причины паузы из ТЗ.
 * «Вызвали помочь» — продуктивная пауза: её время засчитывается в рабочее.
 * Сервер не доверяет флагу клиента для этих причин и подставляет своё значение.
 */
export const PAUSE_PRESETS = [
	{ reason: 'Обед', isProductive: false },
	{ reason: 'Курить', isProductive: false },
	{ reason: 'Вызвали помочь', isProductive: true },
] as const;

/** Возвращает признак продуктивности: для типовых причин — из пресета, иначе — из запроса. */
export function resolveIsProductive(reason: string, requested: boolean): boolean {
	const preset = PAUSE_PRESETS.find((p) => p.reason.toLowerCase() === reason.trim().toLowerCase());
	return preset ? preset.isProductive : requested;
}
