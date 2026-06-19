import type { Vec3 } from '../math/vec.js';

// Pure projection / fit / hit-test helpers for the top-down system map. The map
// looks down +Y: world x → screen x, world z → screen y. Kept separate from the
// Svelte component so the math is unit-tested. See _docs/specs/solar-system-scene.md.

export interface MapView {
	/** World units per pixel reciprocal: screen = center + (world − worldCenter)·scale. */
	scale: number;
	worldCenterX: number;
	worldCenterZ: number;
	width: number;
	height: number;
}

export interface MapBounds {
	minX: number;
	maxX: number;
	minZ: number;
	maxZ: number;
}

/** Axis-aligned XZ bounds of a set of world points (y ignored). Null if empty. */
export function xzBounds(points: Vec3[]): MapBounds | null {
	if (points.length === 0) return null;
	let minX = Infinity;
	let maxX = -Infinity;
	let minZ = Infinity;
	let maxZ = -Infinity;
	for (const p of points) {
		if (p[0] < minX) minX = p[0];
		if (p[0] > maxX) maxX = p[0];
		if (p[2] < minZ) minZ = p[2];
		if (p[2] > maxZ) maxZ = p[2];
	}
	return { minX, maxX, minZ, maxZ };
}

/**
 * A view that frames `bounds` into width×height with `paddingPx` margin, preserving
 * aspect (uniform scale). Empty/degenerate bounds yield a centered unit view.
 */
export function fitView(
	bounds: MapBounds | null,
	width: number,
	height: number,
	paddingPx = 24
): MapView {
	if (!bounds) {
		return { scale: 1, worldCenterX: 0, worldCenterZ: 0, width, height };
	}
	const spanX = Math.max(bounds.maxX - bounds.minX, 1e-6);
	const spanZ = Math.max(bounds.maxZ - bounds.minZ, 1e-6);
	const usableW = Math.max(width - 2 * paddingPx, 1);
	const usableH = Math.max(height - 2 * paddingPx, 1);
	const scale = Math.min(usableW / spanX, usableH / spanZ);
	return {
		scale,
		worldCenterX: (bounds.minX + bounds.maxX) / 2,
		worldCenterZ: (bounds.minZ + bounds.maxZ) / 2,
		width,
		height
	};
}

/** Project a world point to screen pixels (top-down). */
export function projectToScreen(view: MapView, worldX: number, worldZ: number): [number, number] {
	return [
		view.width / 2 + (worldX - view.worldCenterX) * view.scale,
		view.height / 2 + (worldZ - view.worldCenterZ) * view.scale
	];
}

export interface ScreenPoint {
	id: string;
	x: number;
	y: number;
}

/** Nearest point id within `maxDistPx` of (px, py), or null. */
export function pickNearest(
	points: ScreenPoint[],
	px: number,
	py: number,
	maxDistPx: number
): string | null {
	let bestId: string | null = null;
	let bestSq = maxDistPx * maxDistPx;
	for (const p of points) {
		const dx = p.x - px;
		const dy = p.y - py;
		const sq = dx * dx + dy * dy;
		if (sq <= bestSq) {
			bestSq = sq;
			bestId = p.id;
		}
	}
	return bestId;
}
