import { quantity, Type } from '@virtual-planet/schema';

import type { NodePrimitive } from '../../primitive.js';
import { registerPrimitive } from '../../registry.js';

const planeParams = Type.Object({
	resU: quantity('none', { integer: true, min: 2, default: 16, description: 'Subdivisions along U' }),
	resV: quantity('none', { integer: true, min: 2, default: 16, description: 'Subdivisions along V' })
});

/** Parametric resU×resV plane grid geometry source (instanceable). Not an alias of geometry.fullscreenPlane. */
const plane: NodePrimitive = {
	id: 'geometry.plane',
	category: 'geometry/source',
	inputs: [],
	outputs: [{ name: 'mesh', dataType: 'geometry', metadata: { semantic: 'plane-grid' } }],
	params: planeParams,
	wgsl: { moduleId: 'geometry.plane', entry: 'planeGrid' },
	metadata: {
		description: 'Parametric resU×resV plane grid geometry source.',
		help: 'Generates a subdivided plane mesh grid. Instanceable (e.g. six faces for a cube). For a fixed 2-triangle fullscreen quad, use geometry.fullscreenPlane.',
		keywords: ['instanceable', 'grid', 'tessellation'],
		pure: true,
		deterministic: true,
		role: 'pipelineGeometrySource'
	}
};

registerPrimitive(plane);

export { planeParams };
