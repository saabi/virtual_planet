/** WGSL module `math.bias` — Perlin bias curve (matches graph evalCPU). */
export const MATH_BIAS_SOURCE = `fn bias(x: f32, bias: f32) -> f32 {
	return x / ((1.0 / bias - 2.0) * (1.0 - x) + 1.0);
}`;

export const MATH_BIAS_MODULE = {
	id: 'math.bias',
	source: MATH_BIAS_SOURCE
} as const;
