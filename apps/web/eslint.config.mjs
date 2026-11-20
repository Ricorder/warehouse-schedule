import { nextJsConfig } from '@repo/eslint-config/next-js';

/** @type {import("eslint").Linter.Config} */
export default [
	// Файл схемы tRPC генерируется бэкендом при старте — линтить его бессмысленно.
	{ ignores: ['src/shared/api/trpc/@generated/**', '.next/**'] },
	...nextJsConfig,
];
