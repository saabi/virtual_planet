import type { GraphDocument } from '@virtual-planet/graph';

import { outputPortDataType, primaryPreviewOutput } from './graphBuilders.js';

/** Preview backends the editor can show for the current canvas graph. */
export type ScalarPreviewBackend = 'cpu' | 'gpu';
export type PreviewBackend = ScalarPreviewBackend | 'effect' | 'mesh' | 'vegetation';

function fragmentImageConsumer(doc: GraphDocument): boolean {
	if (
		doc.nodes.some((node) => node.primitive === 'stage.fragment') &&
		doc.nodes.some((node) => node.primitive === 'target.display')
	) {
		return true;
	}

	const fragmentConsumer = doc.consumers.find((consumer) => consumer.stage === 'fragment');
	if (!fragmentConsumer) return false;

	for (const outputName of fragmentConsumer.outputs) {
		const graphOutput = doc.outputs.find((candidate) => candidate.name === outputName);
		if (!graphOutput) continue;
		const dataType = outputPortDataType(doc, graphOutput.from);
		if (dataType === 'vec4f') return true;
	}
	return false;
}

/** Pick the default preview backend from the canvas graph's consumer and output type. */
export function inferPreviewBackend(doc: GraphDocument): ScalarPreviewBackend | 'effect' {
	if (fragmentImageConsumer(doc)) {
		return 'effect';
	}

	const output = primaryPreviewOutput(doc);
	if (!output) return 'cpu';

	const dataType = outputPortDataType(doc, output);
	if (dataType === 'f32') return 'cpu';
	return 'cpu';
}

/** Whether the current preview mode still makes sense for this graph. */
export function isPreviewModeCompatible(
	doc: GraphDocument,
	mode: PreviewBackend
): boolean {
	if (mode === 'mesh' || mode === 'vegetation') return true;
	const inferred = inferPreviewBackend(doc);
	if (mode === 'effect') return inferred === 'effect';
	if (mode === 'cpu' || mode === 'gpu') return inferred !== 'effect';
	return true;
}
