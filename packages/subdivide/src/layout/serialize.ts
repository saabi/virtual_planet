import type { GroupData } from './runtime.js';
import type { LayoutDocument } from './types.js';

export function serializeRuntime(root: GroupData): LayoutDocument {
	return {
		root: root.toJSObject()
	};
}
