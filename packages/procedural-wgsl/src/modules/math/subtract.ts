/** WGSL module `math.subtract` — scalar subtract (matches graph evalCPU). */
export const MATH_SUBTRACT_SOURCE = `fn subtract(a: f32, b: f32) -> f32 {
	return a - b;
}`;

export const MATH_SUBTRACT_MODULE = {
	id: 'math.subtract',
	source: MATH_SUBTRACT_SOURCE
} as const;
