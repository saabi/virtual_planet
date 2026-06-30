import { quantity, Type } from '@virtual-planet/schema';

import type { NodePrimitive } from '../../primitive.js';
import { registerPrimitive } from '../../registry.js';

function createPlaneParams(defaultResU = 16, defaultResV = 16) {
	return Type.Object({
		resU: quantity('none', {
			integer: true,
			min: 2,
			default: defaultResU,
			description: 'Subdivisions along U'
		}),
		resV: quantity('none', {
			integer: true,
			min: 2,
			default: defaultResV,
			description: 'Subdivisions along V'
		})
	});
}

const planeParams = createPlaneParams();
const fullscreenPlaneParams = createPlaneParams(2, 2);

/** Parametric resU×resV plane grid geometry source (instanceable). */
const plane: NodePrimitive = {
	id: 'geometry.plane',
	category: 'geometry/source',
	inputs: [],
	outputs: [{ name: 'mesh', dataType: 'geometry', metadata: { semantic: 'plane-grid' } }],
	params: planeParams,
	wgsl: { moduleId: 'geometry.plane', entry: 'planeGrid' },
	metadata: {
		description: 'Parametric resU×resV plane grid geometry source.',
		help: 'Generates a subdivided plane mesh grid. Instanceable (e.g. six faces for a cube). Use { resU: 2, resV: 2 } for a fixed 2-triangle fullscreen quad; legacy geometry.fullscreenPlane graphs resolve to this same plane-grid primitive.',
		keywords: ['instanceable', 'grid', 'tessellation'],
		pure: true,
		deterministic: true,
		role: 'pipelineGeometrySource'
	}
};

registerPrimitive(plane);

export { fullscreenPlaneParams, planeParams };
