/** WGSL module `math.abs` — absolute value (matches graph evalCPU). */
export const MATH_ABS_SOURCE = `fn abs(x: f32) -> f32 {
	return select(-x, x, x >= 0.0);
}`;

export const MATH_ABS_MODULE = {
	id: 'math.abs',
	source: MATH_ABS_SOURCE
} as const;
