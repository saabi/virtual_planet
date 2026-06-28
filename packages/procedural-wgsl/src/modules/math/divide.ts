/** WGSL module `math.divide` — scalar divide (matches graph evalCPU). */
export const MATH_DIVIDE_SOURCE = `fn divide(a: f32, b: f32) -> f32 {
	return a / b;
}`;

export const MATH_DIVIDE_MODULE = {
	id: 'math.divide',
	source: MATH_DIVIDE_SOURCE
} as const;
