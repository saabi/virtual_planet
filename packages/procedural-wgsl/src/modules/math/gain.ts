/** WGSL module `math.gain` — Perlin gain curve (matches graph evalCPU). */
export const MATH_GAIN_SOURCE = `fn gain(x: f32, gain: f32) -> f32 {
	if (x < 0.5) {
		return 0.5 * bias(2.0 * x, gain);
	}
	return 0.5 + 0.5 * bias(2.0 * x - 1.0, 1.0 - gain);
}`;

export const MATH_GAIN_MODULE = {
	id: 'math.gain',
	dependencies: ['math.bias'],
	source: MATH_GAIN_SOURCE
} as const;
