import { dot3, len3, normalize3, sub3, type Vec3 } from '../math/vec.js';
import { getWorldTransform, isNodeEnabled, listBodies } from './sceneTree.js';
import type { BodyNode, PlanetScene } from './types.js';

export const MAX_ECLIPSE_OCCLUDERS = 8;

export interface EclipseOccluder {
	id: string;
	center: Vec3;
	radius: number;
	estimatedObscuration: number;
}

export interface EclipseOccluderSet {
	enabled: boolean;
	sunPosition: Vec3;
	sunRadius: number;
	occluders: EclipseOccluder[];
}

export function diskOverlapArea(a: number, b: number, d: number): number {
	if (a <= 0 || b <= 0) return 0;
	if (d >= a + b) return 0;
	const minR = Math.min(a, b);
	const maxR = Math.max(a, b);
	if (d <= maxR - minR) return Math.PI * minR * minR;
	const aa = a * a;
	const bb = b * b;
	const dd = d * d;
	const ca = Math.max(-1, Math.min(1, (dd + aa - bb) / (2 * d * a)));
	const cb = Math.max(-1, Math.min(1, (dd + bb - aa) / (2 * d * b)));
	const partA = aa * Math.acos(ca);
	const partB = bb * Math.acos(cb);
	const lens = 0.5 * Math.sqrt(Math.max(0, (-d + a + b) * (d + a - b) * (d - a + b) * (d + a + b)));
	return partA + partB - lens;
}

export function diskObscuration(sunAngularRadius: number, occluderAngularRadius: number, separation: number): number {
	const sunArea = Math.PI * sunAngularRadius * sunAngularRadius;
	if (sunArea <= 0) return 0;
	return Math.max(
		0,
		Math.min(1, diskOverlapArea(sunAngularRadius, occluderAngularRadius, separation) / sunArea)
	);
}

export function collectEclipseOccluders(
	scene: PlanetScene,
	receiverBodyId: string,
	options: { maxOccluders?: number; marginRad?: number } = {}
): EclipseOccluderSet {
	const receiver = scene.nodes.get(receiverBodyId);
	if (!receiver || receiver.kind !== 'body' || !isNodeEnabled(scene, receiver.id)) {
		return disabledEclipseSet();
	}

	const bodies = listBodies(scene).filter((b) => isNodeEnabled(scene, b.id));
	const sun = bodies.find((b) => b.bodyType === 'star');
	if (!sun || sun.id === receiver.id) return disabledEclipseSet();

	const receiverCenter = getWorldTransform(scene, receiver.id).position;
	const sunPosition = getWorldTransform(scene, sun.id).position;
	const sunVec = sub3(sunPosition, receiverCenter);
	const sunDistance = len3(sunVec);
	if (sunDistance <= sun.radiusMeters) return disabledEclipseSet();
	const sunDir = normalize3(sunVec);
	const sunAngularRadius = Math.asin(Math.min(1, sun.radiusMeters / sunDistance));
	const marginRad = options.marginRad ?? 0.02;
	const maxOccluders = options.maxOccluders ?? MAX_ECLIPSE_OCCLUDERS;

	const occluders: EclipseOccluder[] = [];
	for (const body of bodies) {
		if (body.id === receiver.id || body.id === sun.id) continue;
		const center = getWorldTransform(scene, body.id).position;
		const v = sub3(center, receiverCenter);
		const dist = len3(v);
		if (dist <= body.radiusMeters) continue;
		const dir = normalize3(v);
		const towardSun = dot3(dir, sunDir);
		if (towardSun <= 0) continue;
		if (dist >= sunDistance) continue;
		const occluderAngularRadius = Math.asin(Math.min(1, body.radiusMeters / dist));
		const separation = Math.acos(Math.max(-1, Math.min(1, towardSun)));
		if (separation > sunAngularRadius + occluderAngularRadius + marginRad) continue;
		const estimatedObscuration = diskObscuration(sunAngularRadius, occluderAngularRadius, separation);
		occluders.push({
			id: body.id,
			center,
			radius: body.radiusMeters,
			estimatedObscuration
		});
	}

	occluders.sort((a, b) => b.estimatedObscuration - a.estimatedObscuration);
	return {
		enabled: true,
		sunPosition,
		sunRadius: sun.radiusMeters,
		occluders: occluders.slice(0, maxOccluders)
	};
}

/**
 * Scene-wide occluder set for receivers that can't run a per-receiver query — the
 * instanced sphere pass and the multi-body atmosphere composite, which shade many bodies
 * in one draw. Lists the sun plus the largest bodies (capped at `maxOccluders`) with no
 * per-receiver alignment culling; the shader skips a body's self-occlusion (a fragment on
 * its own surface sits within its own radius). Positions stay world-space; the caller
 * rebases to its render frame with {@link receiverLocalEclipseSet}.
 */
export function collectGlobalEclipseOccluders(
	scene: PlanetScene,
	options: { maxOccluders?: number } = {}
): EclipseOccluderSet {
	const bodies = listBodies(scene).filter((b) => isNodeEnabled(scene, b.id));
	const sun = bodies.find((b) => b.bodyType === 'star');
	if (!sun || sun.radiusMeters <= 0) return disabledEclipseSet();
	const maxOccluders = options.maxOccluders ?? MAX_ECLIPSE_OCCLUDERS;
	const occluders: EclipseOccluder[] = bodies
		.filter((b) => b.id !== sun.id)
		.map((b) => ({
			id: b.id,
			center: getWorldTransform(scene, b.id).position,
			radius: b.radiusMeters,
			// No receiver to estimate obscuration against; rank by size so the dominant
			// occluders survive the cap.
			estimatedObscuration: b.radiusMeters
		}))
		.sort((a, b) => b.radius - a.radius)
		.slice(0, maxOccluders);
	if (occluders.length === 0) return disabledEclipseSet();
	return {
		enabled: true,
		sunPosition: getWorldTransform(scene, sun.id).position,
		sunRadius: sun.radiusMeters,
		occluders
	};
}

function disabledEclipseSet(): EclipseOccluderSet {
	return { enabled: false, sunPosition: [0, 0, 0], sunRadius: 0, occluders: [] };
}

export function receiverLocalEclipseSet(set: EclipseOccluderSet, receiverWorldPosition: Vec3): EclipseOccluderSet {
	if (!set.enabled) return set;
	return {
		enabled: set.enabled,
		sunPosition: sub3(set.sunPosition, receiverWorldPosition),
		sunRadius: set.sunRadius,
		occluders: set.occluders.map((o) => ({
			...o,
			center: sub3(o.center, receiverWorldPosition)
		}))
	};
}
