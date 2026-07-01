import type { CoordinateSpace, DataType, PortDefaultValue } from '@world-lab/graph';

export type PortBindingSource =
	| { kind: 'edge'; edgeId: string; fromNode: string; fromPort: string }
	| { kind: 'host'; inputId: string }
	| { kind: 'default'; value: PortDefaultValue }
	| { kind: 'unconnected' };

export interface PortBindingState {
	portId: string;
	name: string;
	dataType: DataType;
	space?: CoordinateSpace;
	source: PortBindingSource;
}
