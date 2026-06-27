/** WGSL module `noise.ridgedFbm` — ridged multifractal Perlin (matches graph evalCPU). */
export const NOISE_RIDGED_FBM_SOURCE = `fn ridgedFbm(position: vec3<f32>, octaves: f32, persistence: f32, lacunarity: f32, offset: f32) -> f32 {
	var value = 0.0;
	var amplitude = 1.0;
	var frequency = 1.0;
	var weight = 1.0;
	let octaveCount = i32(octaves);
	for (var i = 0; i < octaveCount; i = i + 1) {
		var signal = offset - abs(perlin3d(position * frequency));
		signal = signal * signal;
		signal = signal * weight;
		weight = min(1.0, signal * 2.0);
		value = value + signal * amplitude;
		amplitude = amplitude * persistence;
		frequency = frequency * lacunarity;
	}
	return value;
}`;

export const NOISE_RIDGED_FBM_MODULE = {
	id: 'noise.ridgedFbm',
	source: NOISE_RIDGED_FBM_SOURCE,
	dependencies: ['noise.perlin3d']
} as const;
