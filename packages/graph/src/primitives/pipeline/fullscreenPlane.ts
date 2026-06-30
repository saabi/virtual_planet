import type { NodePrimitive } from '../../primitive.js';
import { registerPrimitive } from '../../registry.js';
import { fullscreenPlaneParams } from './plane.js';

/** Back-compat alias for a 2x2 `geometry.plane` used by saved S0 fullscreen graphs. */
const fullscreenPlane: NodePrimitive = {
	id: 'geometry.fullscreenPlane',
	category: 'geometry/source',
	inputs: [],
	outputs: [{ name: 'mesh', dataType: 'geometry', metadata: { semantic: 'plane-grid' } }],
	params: fullscreenPlaneParams,
	wgsl: { moduleId: 'geometry.plane', entry: 'planeGrid' },
	metadata: {
		description: 'Compatibility alias for a 2x2 fullscreen plane geometry source.',
		help: 'Equivalent to geometry.plane with { resU: 2, resV: 2 }. New graphs should use geometry.plane directly.',
		keywords: ['compatibility', 'fullscreen', 'plane'],
		pure: true,
		deterministic: true,
		role: 'pipelineGeometrySource'
	}
};

registerPrimitive(fullscreenPlane);
