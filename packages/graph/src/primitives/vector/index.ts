import { quantity, Type } from '@virtual-planet/schema';

import type { NodePrimitive } from '../../primitive.js';
import { registerPrimitive } from '../../registry.js';

const constantF32: NodePrimitive = {
	id: 'constant.f32',
	category: 'constant',
	inputs: [],
	outputs: [{ name: 'value', dataType: 'f32' }],
	params: Type.Object({
		value: quantity('none', { default: 0, description: 'Scalar value' })
	}),
	wgsl: {
		moduleId: 'constant.f32',
		entry: 'constantF32',
		arguments: [{ name: 'value', source: 'param' }]
	},
	metadata: {
		description: 'Authored scalar f32 constant.',
		pure: true,
		deterministic: true,
		role: 'constant'
	},
	evalCPU(ctx) {
		return { value: ctx.params.value as number };
	}
};

const vec2f: NodePrimitive = {
	id: 'vector.vec2f',
	category: 'vector',
	inputs: [
		{ name: 'x', dataType: 'f32' },
		{ name: 'y', dataType: 'f32' }
	],
	outputs: [{ name: 'value', dataType: 'vec2f' }],
	params: Type.Object({}),
	wgsl: { moduleId: 'vector.vec2f', entry: 'makeVec2f' },
	metadata: { description: 'Construct a vec2f from scalar components.', pure: true, deterministic: true },
	evalCPU(ctx) {
		return { value: [ctx.inputs.x as number, ctx.inputs.y as number] };
	}
};

const vec3f: NodePrimitive = {
	id: 'vector.vec3f',
	category: 'vector',
	inputs: [
		{ name: 'x', dataType: 'f32' },
		{ name: 'y', dataType: 'f32' },
		{ name: 'z', dataType: 'f32' }
	],
	outputs: [{ name: 'value', dataType: 'vec3f' }],
	params: Type.Object({}),
	wgsl: { moduleId: 'vector.vec3f', entry: 'makeVec3f' },
	metadata: { description: 'Construct a vec3f from scalar components.', pure: true, deterministic: true },
	evalCPU(ctx) {
		return { value: [ctx.inputs.x as number, ctx.inputs.y as number, ctx.inputs.z as number] };
	}
};

const vec4f: NodePrimitive = {
	id: 'vector.vec4f',
	category: 'vector',
	inputs: [
		{ name: 'x', dataType: 'f32' },
		{ name: 'y', dataType: 'f32' },
		{ name: 'z', dataType: 'f32' },
		{ name: 'w', dataType: 'f32' }
	],
	outputs: [{ name: 'value', dataType: 'vec4f' }],
	params: Type.Object({}),
	wgsl: { moduleId: 'vector.vec4f', entry: 'makeVec4f' },
	metadata: { description: 'Construct a vec4f from scalar components.', pure: true, deterministic: true },
	evalCPU(ctx) {
		return {
			value: [
				ctx.inputs.x as number,
				ctx.inputs.y as number,
				ctx.inputs.z as number,
				ctx.inputs.w as number
			]
		};
	}
};

function componentPrimitive(
	id: string,
	inputType: 'vec2f' | 'vec3f' | 'vec4f',
	component: 'x' | 'y' | 'z' | 'w',
	index: number
): NodePrimitive {
	return {
		id,
		category: 'vector',
		inputs: [{ name: 'value', dataType: inputType }],
		outputs: [{ name: component, dataType: 'f32' }],
		params: Type.Object({}),
		wgsl: { moduleId: id, entry: `${inputType}${component.toUpperCase()}` },
		metadata: {
			description: `Extract ${component} from ${inputType}.`,
			pure: true,
			deterministic: true
		},
		evalCPU(ctx) {
			const value = ctx.inputs.value as number[];
			return { [component]: value[index] ?? 0 };
		}
	};
}

const primitives = [
	constantF32,
	vec2f,
	vec3f,
	vec4f,
	componentPrimitive('vector.vec2f.x', 'vec2f', 'x', 0),
	componentPrimitive('vector.vec2f.y', 'vec2f', 'y', 1),
	componentPrimitive('vector.vec3f.x', 'vec3f', 'x', 0),
	componentPrimitive('vector.vec3f.y', 'vec3f', 'y', 1),
	componentPrimitive('vector.vec3f.z', 'vec3f', 'z', 2),
	componentPrimitive('vector.vec4f.x', 'vec4f', 'x', 0),
	componentPrimitive('vector.vec4f.y', 'vec4f', 'y', 1),
	componentPrimitive('vector.vec4f.z', 'vec4f', 'z', 2),
	componentPrimitive('vector.vec4f.w', 'vec4f', 'w', 3)
];

for (const primitive of primitives) {
	registerPrimitive(primitive);
}
