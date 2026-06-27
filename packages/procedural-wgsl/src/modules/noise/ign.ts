import { USEGPU_LICENSE_HEADER } from '../_attribution.js';

/** WGSL module `noise.ign` — interleaved gradient noise (ported from @use-gpu/wgsl/fragment/noise.wgsl). */
export const NOISE_IGN_SOURCE = `${USEGPU_LICENSE_HEADER}
/*---
id: noise.ign
entry: ign
category: Noise
group: Fields
source: use.gpu
sourceSymbol: IGN
---*/
fn ign(xy: vec2<f32>, frame: u32) -> f32 {
	let uv = xy + vec2<f32>(5.588238) * f32(frame % 64u);
	let f = dot(vec2<f32>(0.06711056, 0.00583715), uv) % 1.0;
	return (52.9829189 * f) % 1.0;
}`;

export const NOISE_IGN_MODULE = {
	id: 'noise.ign',
	source: NOISE_IGN_SOURCE
} as const;
