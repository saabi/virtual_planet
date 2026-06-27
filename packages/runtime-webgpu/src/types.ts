import type { GraphDocument, PortRef } from '@virtual-planet/graph';

/** Known consumer kinds executed by the WebGPU runtime. */
export type ConsumerKind = 'plane-scalar-preview' | 'plane-mesh' | 'surface-mesh-preview';

export interface ConsumerExecuteInput {
	device: GPUDevice;
	graph: GraphDocument;
	output: PortRef;
	width: number;
	height: number;
}

/** Normalized scalar field as RGBA8 pixels (row-major). */
export interface ScalarFieldResult {
	width: number;
	height: number;
	pixels: Uint8Array;
}

export interface ConsumerExecuteResult {
	kind: ConsumerKind;
	scalarField?: ScalarFieldResult;
}
