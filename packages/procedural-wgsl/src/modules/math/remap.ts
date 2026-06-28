/** WGSL module `math.remap` — linear range remap composed of elemental math atoms (matches graph evalCPU). */
export const MATH_REMAP_SOURCE = `// @use math.subtract
// @use math.divide
// @use math.multiply
// @use math.add
fn remap(x: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
	let v_sub1 = subtract(x, inMin);
	let v_sub2 = subtract(inMax, inMin);
	let v_div = divide(v_sub1, v_sub2);
	let v_sub3 = subtract(outMax, outMin);
	let v_mult = multiply(v_div, v_sub3);
	let v_add = add(outMin, v_mult);
	return v_add;
}`;

export const MATH_REMAP_MODULE = {
	id: 'math.remap',
	source: MATH_REMAP_SOURCE
} as const;
