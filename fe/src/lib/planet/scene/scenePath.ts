import type { PlanetScene } from './types.js';

// Shared scene-path resolver: the URL-is-the-tree addressing language used by
// transform inheritance, references (ref), and (later) routing. Absolute paths
// ('/a/b') resolve from the root's children; relative paths ('../', '../sibling',
// 'child') from the source node. Unrestricted in direction — callers that need
// acyclicity (transform inheritance) rely on the world-transform resolver's cycle
// guard, not on a structural restriction here. See _docs/specs/scene-routing.md.

/** Path that means "the immediate parent" — the default inheritance for a channel. */
export const PARENT_PATH = '../';

/** Path-segment slug for a node name (lowercase, spaces → `-`). */
export function slugify(name: string): string {
	return name.trim().toLowerCase().replace(/\s+/g, '-');
}

function childByName(scene: PlanetScene, parentId: string | null, name: string): string | null {
	const target = slugify(name);
	for (const node of scene.nodes.values()) {
		if (node.parentId === parentId && slugify(node.name) === target) return node.id;
	}
	return null;
}

/**
 * Node ids from the root's child down to `nodeId` (root excluded — it's `/`). null
 * if `nodeId` isn't under the root. The inverse direction of {@link resolvePath}.
 */
export function pathNodeIds(scene: PlanetScene, nodeId: string): string[] | null {
	const ids: string[] = [];
	let id: string | null = nodeId;
	while (id != null && id !== scene.rootId) {
		const node = scene.nodes.get(id);
		if (!node) return null;
		ids.unshift(id);
		id = node.parentId;
	}
	return id === scene.rootId ? ids : null;
}

/** Absolute scene path (name slugs) to a node — `resolvePath(scene, root, '/' + pathOf(…).join('/'))` returns it back. */
export function pathOf(scene: PlanetScene, nodeId: string): string[] | null {
	const ids = pathNodeIds(scene, nodeId);
	return ids ? ids.map((id) => slugify(scene.nodes.get(id)!.name)) : null;
}

/**
 * Resolve a scene path to a node id, or `null` for the world frame (a path above
 * the root, or a missing segment). Absolute paths are rooted at the root node
 * (which is unnamed in the path: `/` = root, `/sol` = root's child "sol"); relative
 * paths resolve from `fromNodeId` (`..` = parent, `.` = self, a name = a child).
 * Segments match node names, normalized (lowercase, spaces → `-`).
 */
export function resolvePath(scene: PlanetScene, fromNodeId: string, path: string): string | null {
	let current: string | null;
	let segments: string[];
	if (path.startsWith('/')) {
		current = scene.rootId;
		segments = path.slice(1).split('/');
	} else {
		current = fromNodeId;
		segments = path.split('/');
	}
	for (const seg of segments) {
		if (seg === '' || seg === '.') continue;
		if (current == null) return null;
		if (seg === '..') {
			current = scene.nodes.get(current)?.parentId ?? null;
		} else {
			current = childByName(scene, current, seg);
			if (current == null) return null;
		}
	}
	return current;
}
