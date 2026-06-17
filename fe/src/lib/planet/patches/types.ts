export type RenderMode = 'orbit' | 'flight' | 'surface';

export interface ScaleContext {
	cameraAltitudeMeters: number;
	distanceToCameraMeters: number;
	metersPerPixel: number;
	maxFeatureFrequency: number;
	mode: RenderMode;
}

export interface PatchDescriptor {
	kind: 'cubeSphere' | 'surface';
	id: number;
	resolution: number;
	morph: number;
}

export interface CubeSpherePatch extends PatchDescriptor {
	kind: 'cubeSphere';
	face: 0 | 1 | 2 | 3 | 4 | 5;
	uvMin: [number, number];
	uvMax: [number, number];
}

export interface SurfacePatch extends PatchDescriptor {
	kind: 'surface';
	originLocalMeters: [number, number];
	sizeMeters: number;
	ring: number;
	maxFeatureMeters: number;
}

export interface GpuCubeSpherePatch {
	face: number;
	uvMinX: number;
	uvMinY: number;
	uvMaxX: number;
	uvMaxY: number;
	resolution: number;
	morph: number;
	_pad: number;
}

export interface GpuSurfacePatch {
	originX: number;
	originY: number;
	sizeMeters: number;
	resolution: number;
	ring: number;
	maxFeatureMeters: number;
	morph: number;
	_pad0: number;
	_pad1: number;
}
