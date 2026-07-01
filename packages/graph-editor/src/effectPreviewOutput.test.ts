import '@world-lab/graph';
import { describe, expect, it } from 'vitest';
import { effectiveGraphDocument } from '@world-lab/graph';
import { planPipelineGraph } from '@world-lab/runtime-webgpu';

import { animatedWorleyPipelineGraph } from './graphBuilders.js';
import { enumeratePreviewBuffers, resolvePreviewBufferPort } from './previewBuffers.js';

describe('Effect preview output selection', () => {
	it('plans different pipeline fields for two display sinks on the Worley sample', () => {
		const graph = effectiveGraphDocument(animatedWorleyPipelineGraph());
		const buffers = enumeratePreviewBuffers(graph).filter((buffer) => buffer.family === 'image');
		expect(buffers).toHaveLength(2);

		const outputA = resolvePreviewBufferPort(graph, buffers[0]!);
		const outputB = resolvePreviewBufferPort(graph, buffers[1]!);
		expect(outputA).not.toEqual(outputB);

		const planA = planPipelineGraph(graph, { output: outputA! });
		const planB = planPipelineGraph(graph, { output: outputB! });
		expect(planA.fieldOutput).toEqual(outputA);
		expect(planB.fieldOutput).toEqual(outputB);
		expect(planA.displayTargetNode).not.toBe(planB.displayTargetNode);
		expect(planA.fragmentStageNode).not.toBe(planB.fragmentStageNode);
	});
});
