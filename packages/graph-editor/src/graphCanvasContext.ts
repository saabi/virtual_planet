import { getContext, setContext } from 'svelte';

const GRAPH_CANVAS_CONTEXT = Symbol('graph-canvas-context');

export interface GraphCanvasContext {
	onReplacePrimitive: (nodeId: string, primitiveId: string) => void;
	onAddConnectedNode: (args: {
		source: { node: string; port: string };
		sourceDirection: 'in' | 'out';
		primitiveId: string;
		position: { x: number; y: number };
	}) => void;
}

export function setGraphCanvasContext(context: GraphCanvasContext): void {
	setContext(GRAPH_CANVAS_CONTEXT, context);
}

export function getGraphCanvasContext(): GraphCanvasContext {
	return getContext<GraphCanvasContext>(GRAPH_CANVAS_CONTEXT);
}
