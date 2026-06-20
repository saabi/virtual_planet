import type { PlanetScene, SceneNode } from './types.js';

// Scene (de)serialization for persistence. The scene is plain data — nodes with
// transforms, drivers (orbit/orbitPhase/spin), inheritance paths, and kind-specific
// fields — so it round-trips through JSON. A version field leaves room for migration
// (detect → migrate → coerce), like the planet documents. Deep links / routing need
// a loadable scene; see _docs/specs/scene-routing.md.

const SCENE_DOC_VERSION = 1;

export interface SceneDocument {
	version: number;
	rootId: string;
	nodes: SceneNode[];
}

export function serializeScene(scene: PlanetScene): string {
	const doc: SceneDocument = {
		version: SCENE_DOC_VERSION,
		rootId: scene.rootId,
		nodes: [...scene.nodes.values()]
	};
	return JSON.stringify(doc);
}

function isValidNode(n: unknown): n is SceneNode {
	if (!n || typeof n !== 'object') return false;
	const o = n as Record<string, unknown>;
	const t = o.transform as { position?: unknown; rotation?: unknown } | undefined;
	return (
		typeof o.id === 'string' &&
		typeof o.name === 'string' &&
		(o.parentId === null || typeof o.parentId === 'string') &&
		typeof o.kind === 'string' &&
		typeof o.enabled === 'boolean' &&
		!!t &&
		Array.isArray(t.position) &&
		Array.isArray(t.rotation)
	);
}

/** Parse a serialized scene; null if malformed (caller falls back to a default). */
export function deserializeScene(json: string): PlanetScene | null {
	let doc: unknown;
	try {
		doc = JSON.parse(json);
	} catch {
		return null;
	}
	if (!doc || typeof doc !== 'object') return null;
	const d = doc as Record<string, unknown>;
	if (typeof d.rootId !== 'string' || !Array.isArray(d.nodes)) return null;

	const nodes = new Map<string, SceneNode>();
	for (const n of d.nodes) {
		if (!isValidNode(n)) return null;
		nodes.set(n.id, n);
	}
	if (!nodes.has(d.rootId)) return null;
	return { rootId: d.rootId, nodes };
}
