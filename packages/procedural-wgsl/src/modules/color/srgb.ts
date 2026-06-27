import { USEGPU_LICENSE_HEADER } from '../_attribution.js';

/** WGSL module `color.srgbToLinear` — gamma 2.2 decode (ported from @use-gpu/wgsl/use/gamma.wgsl). */
export const COLOR_SRGB_TO_LINEAR_SOURCE = `${USEGPU_LICENSE_HEADER}
/*---
id: color.srgbToLinear
entry: srgbToLinear
category: Colour
group: Effects
source: use.gpu
sourceSymbol: toLinear3
---*/
const SRGB_GAMMA: f32 = 2.2;

fn srgbToLinear(srgb: vec3<f32>) -> vec3<f32> {
	return pow(srgb, vec3<f32>(SRGB_GAMMA));
}`;

export const COLOR_SRGB_TO_LINEAR_MODULE = {
	id: 'color.srgbToLinear',
	source: COLOR_SRGB_TO_LINEAR_SOURCE
} as const;

/** WGSL module `color.linearToSrgb` — gamma 2.2 encode (ported from @use-gpu/wgsl/use/gamma.wgsl). */
export const COLOR_LINEAR_TO_SRGB_SOURCE = `${USEGPU_LICENSE_HEADER}
/*---
id: color.linearToSrgb
entry: linearToSrgb
category: Colour
group: Effects
source: use.gpu
sourceSymbol: toGamma3
---*/
const SRGB_GAMMA: f32 = 2.2;

fn linearToSrgb(linear: vec3<f32>) -> vec3<f32> {
	return pow(linear, vec3<f32>(1.0 / SRGB_GAMMA));
}`;

export const COLOR_LINEAR_TO_SRGB_MODULE = {
	id: 'color.linearToSrgb',
	source: COLOR_LINEAR_TO_SRGB_SOURCE
} as const;
