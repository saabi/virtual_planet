export const CONSTANT_F32_SOURCE = `fn constantF32(value: f32) -> f32 {
	return value;
}`;

export const VECTOR_VEC2F_SOURCE = `fn makeVec2f(x: f32, y: f32) -> vec2<f32> {
	return vec2<f32>(x, y);
}`;

export const VECTOR_VEC3F_SOURCE = `fn makeVec3f(x: f32, y: f32, z: f32) -> vec3<f32> {
	return vec3<f32>(x, y, z);
}`;

export const VECTOR_VEC4F_SOURCE = `fn makeVec4f(x: f32, y: f32, z: f32, w: f32) -> vec4<f32> {
	return vec4<f32>(x, y, z, w);
}`;

function componentSource(inputType: string, component: string, entry: string): string {
	return `fn ${entry}(value: ${inputType}) -> f32 {
	return value.${component};
}`;
}

export const VECTOR_VEC2F_X_SOURCE = componentSource('vec2<f32>', 'x', 'vec2fX');
export const VECTOR_VEC2F_Y_SOURCE = componentSource('vec2<f32>', 'y', 'vec2fY');
export const VECTOR_VEC3F_X_SOURCE = componentSource('vec3<f32>', 'x', 'vec3fX');
export const VECTOR_VEC3F_Y_SOURCE = componentSource('vec3<f32>', 'y', 'vec3fY');
export const VECTOR_VEC3F_Z_SOURCE = componentSource('vec3<f32>', 'z', 'vec3fZ');
export const VECTOR_VEC4F_X_SOURCE = componentSource('vec4<f32>', 'x', 'vec4fX');
export const VECTOR_VEC4F_Y_SOURCE = componentSource('vec4<f32>', 'y', 'vec4fY');
export const VECTOR_VEC4F_Z_SOURCE = componentSource('vec4<f32>', 'z', 'vec4fZ');
export const VECTOR_VEC4F_W_SOURCE = componentSource('vec4<f32>', 'w', 'vec4fW');

export const CONSTANT_F32_MODULE = {
	id: 'constant.f32',
	source: CONSTANT_F32_SOURCE
} as const;

export const VECTOR_VEC2F_MODULE = {
	id: 'vector.vec2f',
	source: VECTOR_VEC2F_SOURCE
} as const;

export const VECTOR_VEC3F_MODULE = {
	id: 'vector.vec3f',
	source: VECTOR_VEC3F_SOURCE
} as const;

export const VECTOR_VEC4F_MODULE = {
	id: 'vector.vec4f',
	source: VECTOR_VEC4F_SOURCE
} as const;

export const VECTOR_VEC2F_X_MODULE = {
	id: 'vector.vec2f.x',
	source: VECTOR_VEC2F_X_SOURCE
} as const;

export const VECTOR_VEC2F_Y_MODULE = {
	id: 'vector.vec2f.y',
	source: VECTOR_VEC2F_Y_SOURCE
} as const;

export const VECTOR_VEC3F_X_MODULE = {
	id: 'vector.vec3f.x',
	source: VECTOR_VEC3F_X_SOURCE
} as const;

export const VECTOR_VEC3F_Y_MODULE = {
	id: 'vector.vec3f.y',
	source: VECTOR_VEC3F_Y_SOURCE
} as const;

export const VECTOR_VEC3F_Z_MODULE = {
	id: 'vector.vec3f.z',
	source: VECTOR_VEC3F_Z_SOURCE
} as const;

export const VECTOR_VEC4F_X_MODULE = {
	id: 'vector.vec4f.x',
	source: VECTOR_VEC4F_X_SOURCE
} as const;

export const VECTOR_VEC4F_Y_MODULE = {
	id: 'vector.vec4f.y',
	source: VECTOR_VEC4F_Y_SOURCE
} as const;

export const VECTOR_VEC4F_Z_MODULE = {
	id: 'vector.vec4f.z',
	source: VECTOR_VEC4F_Z_SOURCE
} as const;

export const VECTOR_VEC4F_W_MODULE = {
	id: 'vector.vec4f.w',
	source: VECTOR_VEC4F_W_SOURCE
} as const;
