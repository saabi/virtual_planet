/** WGSL module `color.hsv2rgb` — HSV to RGB (reauthored; standard algorithm, not Use.GPU). */
export const COLOR_HSV_TO_RGB_SOURCE = `/*---
id: color.hsv2rgb
entry: hsv2rgb
category: Colour
group: Effects
source: reauthored
sourceSymbol: hsv2rgb
---*/
fn hsv2rgb(h: f32, s: f32, v: f32) -> vec3<f32> {
	let c = v * s;
	let hp = fract(h) * 6.0;
	let x = c * (1.0 - abs(hp - 2.0 * floor(hp * 0.5 + 0.5) - 1.0));
	let m = v - c;
	var rgb = vec3<f32>(0.0);
	if (hp < 1.0) { rgb = vec3<f32>(c, x, 0.0); }
	else if (hp < 2.0) { rgb = vec3<f32>(x, c, 0.0); }
	else if (hp < 3.0) { rgb = vec3<f32>(0.0, c, x); }
	else if (hp < 4.0) { rgb = vec3<f32>(0.0, x, c); }
	else if (hp < 5.0) { rgb = vec3<f32>(x, 0.0, c); }
	else { rgb = vec3<f32>(c, 0.0, x); }
	return rgb + vec3<f32>(m);
}`;

export const COLOR_HSV_TO_RGB_MODULE = {
	id: 'color.hsv2rgb',
	source: COLOR_HSV_TO_RGB_SOURCE
} as const;
