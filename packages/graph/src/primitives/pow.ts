import { quantity, Type } from '@virtual-planet/schema';

import type { NodePrimitive } from '../primitive.js';
import { registerPrimitive } from '../registry.js';

const pow: NodePrimitive = {
	id: 'math.pow',
	category: 'math',
	inputs: [{ name: 'x', dataType: 'f32' }],
	outputs: [{ name: 'value', dataType: 'f32' }],
	params: Type.Object({
		exponent: quantity('none', { default: 2 })
	}),
	wgsl: { moduleId: 'math.pow', entry: 'pow' },
	evalCPU(ctx) {
		const x = ctx.inputs.x as number;
		const exponent = ctx.params.exponent as number;
		return { value: Math.pow(x, exponent) };
	}
};

registerPrimitive(pow);
