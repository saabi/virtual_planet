/** WGSL uniform block for ShaderToy host inputs (per-target iResolution). */
export const SHADERTOY_UNIFORM_STRUCT_WGSL = `struct ShaderToyUniforms {
	iResolution: vec2f,
	iTime: f32,
	_pad0: f32,
	iMouse: vec4f,
	iFrame: u32,
	_pad1_0: u32,
	_pad1_1: u32,
	_pad1_2: u32,
}`;

/** Byte length of `ShaderToyUniforms` in WGSL uniform layout (48). */
export const SHADERTOY_UNIFORM_BYTE_LENGTH = 48;

export const SHADERTOY_UNIFORM_OFFSETS = {
	iResolution: 0,
	iTime: 8,
	iMouse: 16,
	iFrame: 32
} as const;

export interface ShaderToyUniformValues {
	width: number;
	height: number;
	iTime: number;
	iMouse?: [number, number, number, number];
	iFrame?: number;
}

/** Pack host uniforms for GPU upload (little-endian f32/u32). */
export function packShaderToyUniforms(values: ShaderToyUniformValues): ArrayBuffer {
	const buffer = new ArrayBuffer(SHADERTOY_UNIFORM_BYTE_LENGTH);
	const f32 = new Float32Array(buffer);
	const u32 = new Uint32Array(buffer);

	f32[0] = values.width;
	f32[1] = values.height;
	f32[2] = values.iTime;
	// f32[3] padding

	const mouse = values.iMouse ?? [0, 0, 0, 0];
	f32[4] = mouse[0]!;
	f32[5] = mouse[1]!;
	f32[6] = mouse[2]!;
	f32[7] = mouse[3]!;

	u32[8] = values.iFrame ?? 0;
	return buffer;
}

/** Expected RGBA at fragCoord with iTime=0 (ShaderToy default palette). */
export function cosinePaletteAtOrigin(width: number, height: number): [number, number, number, number] {
	const uv = [0 / width, 0 / height];
	const col = [0, 1, 2].map((i) => {
		const phase = (i === 0 ? uv[0]! : i === 1 ? uv[1]! : uv[0]!) + [0, 2, 4][i]!;
		return 0.5 + 0.5 * Math.cos(phase);
	});
	return [
		Math.round(col[0]! * 255),
		Math.round(col[1]! * 255),
		Math.round(col[2]! * 255),
		255
	];
}
