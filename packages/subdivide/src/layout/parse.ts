import { createPaneId } from './id.js';
import type { LayoutDocument, LayoutGroup, LayoutNode, LayoutPane } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function coerceNumber(value: unknown, field: string, fallback: number): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
		return Number(value);
	}
	throw new Error(`Invalid layout: ${field} must be a finite number`);
}

function coerceBoolean(value: unknown, field: string, fallback: boolean): boolean {
	if (typeof value === 'boolean') return value;
	if (value === 'true') return true;
	if (value === 'false') return false;
	if (value === undefined || value === null) return fallback;
	throw new Error(`Invalid layout: ${field} must be a boolean`);
}

function coerceString(value: unknown, field: string, fallback?: string): string {
	if (typeof value === 'string' && value.length > 0) return value;
	if (fallback !== undefined) return fallback;
	throw new Error(`Invalid layout: ${field} must be a non-empty string`);
}

function coercePane(raw: unknown, defaultZone: string): LayoutPane {
	if (!isRecord(raw) || raw.type !== 'pane') {
		throw new Error('Invalid layout: expected pane node');
	}

	const id =
		typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : createPaneId();

	const zoneRaw =
		raw.zone ?? (typeof raw.childProps === 'string' ? raw.childProps : undefined);

	return {
		type: 'pane',
		id,
		zone: coerceString(zoneRaw, 'pane.zone', defaultZone),
		pos: coerceNumber(raw.pos, 'pane.pos', 0),
		size: coerceNumber(raw.size, 'pane.size', 1)
	};
}

function coerceGroup(raw: unknown, defaultZone: string): LayoutGroup {
	if (!isRecord(raw) || raw.type !== 'group') {
		throw new Error('Invalid layout: expected group node');
	}

	const childrenRaw = raw.children;
	if (!Array.isArray(childrenRaw) || childrenRaw.length === 0) {
		throw new Error('Invalid layout: group must have at least one child');
	}

	const children: LayoutNode[] = childrenRaw.map((child) => {
		if (!isRecord(child)) throw new Error('Invalid layout: child must be an object');
		if (child.type === 'group') return coerceGroup(child, defaultZone);
		if (child.type === 'pane') return coercePane(child, defaultZone);
		throw new Error(`Invalid layout: unknown child type ${String(child.type)}`);
	});

	return {
		type: 'group',
		row: coerceBoolean(raw.row, 'group.row', false),
		pos: coerceNumber(raw.pos, 'group.pos', 0),
		size: coerceNumber(raw.size, 'group.size', 1),
		children
	};
}

export function parseLayoutDocument(raw: unknown, defaultZone = 'default'): LayoutDocument {
	if (!isRecord(raw)) {
		throw new Error('Invalid layout: document must be an object');
	}

	if (!isRecord(raw.root)) {
		throw new Error('Invalid layout: document must have a root group');
	}

	return {
		root: coerceGroup(raw.root, defaultZone)
	};
}
