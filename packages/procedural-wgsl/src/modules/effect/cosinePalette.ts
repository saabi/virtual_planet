/** WGSL module `effect.cosinePalette` — ShaderToy default cosine palette (authored fresh). */
export const EFFECT_COSINE_PALETTE_SOURCE = `/*---
id: effect.cosinePalette
entry: cosine_palette
category: ShaderToy
group: Effects
---*/
fn cosine_palette(fragCoord: vec2f, iResolution: vec2f, iTime: f32) -> vec4f {
	let uv = fragCoord / iResolution;
	let col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3f(0.0, 2.0, 4.0));
	return vec4f(col, 1.0);
}`;

export const EFFECT_COSINE_PALETTE_MODULE = {
	id: 'effect.cosinePalette',
	source: EFFECT_COSINE_PALETTE_SOURCE
} as const;
