import { MAX_ECLIPSE_OCCLUDERS, type EclipseOccluderSet } from './eclipseOccluders.js';

export const ECLIPSE_UNIFORM_SIZE = 256;

export interface GpuEclipseOccluder {
	centerRadius: [number, number, number, number];
}

export interface EclipseUniforms {
	sunPositionRadius: [number, number, number, number];
	params: [number, number, number, number]; // count, enabled, contrast, _
	occluders: GpuEclipseOccluder[];
}

export const DEFAULT_ECLIPSE_UNIFORMS: EclipseUniforms = {
	sunPositionRadius: [0, 0, 0, 0],
	params: [0, 0, 0, 0],
	occluders: []
};

/** `contrast` is an artistic gain on the occluded fraction (1 = physical); see eclipse.wgsl. */
export function packEclipseUniforms(
	set: EclipseOccluderSet | undefined,
	contrast = 1
): EclipseUniforms {
	if (!set?.enabled || set.sunRadius <= 0) return DEFAULT_ECLIPSE_UNIFORMS;
	const occluders = set.occluders.slice(0, MAX_ECLIPSE_OCCLUDERS).map((o) => ({
		centerRadius: [o.center[0], o.center[1], o.center[2], o.radius] as [number, number, number, number]
	}));
	return {
		sunPositionRadius: [...set.sunPosition, set.sunRadius] as [number, number, number, number],
		params: [occluders.length, 1, contrast, 0],
		occluders
	};
}

export function writeEclipseUniforms(buffer: ArrayBuffer, u: EclipseUniforms): void {
	const view = new DataView(buffer);
	writeVec4(view, 0, u.sunPositionRadius);
	writeVec4(view, 16, u.params);
	for (let i = 0; i < MAX_ECLIPSE_OCCLUDERS; i++) {
		const occ = u.occluders[i]?.centerRadius ?? ([0, 0, 0, 0] as [number, number, number, number]);
		writeVec4(view, 32 + i * 16, occ);
	}
}

function writeVec4(view: DataView, offset: number, v: [number, number, number, number]): void {
	view.setFloat32(offset + 0, v[0], true);
	view.setFloat32(offset + 4, v[1], true);
	view.setFloat32(offset + 8, v[2], true);
	view.setFloat32(offset + 12, v[3], true);
}
