import { Type } from '@virtual-planet/schema';

import type { NodePrimitive } from '../../primitive.js';
import { registerPrimitive } from '../../registry.js';

/** Fixed 2-triangle S0 fullscreen quad — distinct from `geometry.plane` (parametric grid). */
const fullscreenPlane: NodePrimitive = {
	id: 'geometry.fullscreenPlane',
	category: 'geometry/source',
	inputs: [],
	outputs: [{ name: 'mesh', dataType: 'geometry', metadata: { semantic: 'fullscreen-plane' } }],
	params: Type.Object({}),
	wgsl: { moduleId: 'geometry.fullscreenPlane', entry: 'fullscreenPlane' },
	metadata: {
		description: 'Two-triangle fullscreen plane geometry source.',
		help: 'Fixed 2-triangle quad for S0 fullscreen passes. Use geometry.plane for a subdivided res×res grid (instanceable).',
		pure: true,
		deterministic: true,
		role: 'pipelineGeometrySource'
	}
};

registerPrimitive(fullscreenPlane);
