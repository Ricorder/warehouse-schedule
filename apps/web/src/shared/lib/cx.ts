/** Склеивает CSS-классы, отбрасывая пустые. Классы SCSS-модулей типизированы как `string | undefined`. */
export function cx(...classes: Array<string | false | null | undefined>): string {
	return classes.filter(Boolean).join(' ');
}
