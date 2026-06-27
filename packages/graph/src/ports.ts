import type { DataType } from './types.js';

/** Whether an output data type may connect to an input port type. */
export function compatibleDataTypes(from: DataType, to: DataType): boolean {
	if (from === to) return true;
	// Plane UV (vec2f) promoted to vec3f inputs (z = 0) — matches runtime-cpu evalGraph.
	if (from === 'vec2f' && to === 'vec3f') return true;
	return false;
}
