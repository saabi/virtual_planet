/// <reference types="@webgpu/types" />

import {
	PLANET_PARAMS_BYTE_SIZE,
	SCALE_CONTEXT_BYTE_SIZE,
	LOCAL_FRAME_BYTE_SIZE,
	writePlanetParamsToBuffer,
	type GpuLocalFrame,
	type GpuPlanetParams,
	type GpuScaleContext
} from '../params/planetParams.js';
import type { CubeSpherePatch, SurfacePatch } from '../patches/types.js';
import { CUBE_SPHERE_PATCH_BYTE_SIZE } from '../params/planetParams.js';

export const MAX_CUBE_PATCHES = 4096;
export const CUBE_PATCH_RING_BYTES = MAX_CUBE_PATCHES * CUBE_SPHERE_PATCH_BYTE_SIZE;

export { writePlanetParamsToBuffer };

export function writeScaleContextToBuffer(
	buffer: ArrayBuffer,
	offset: number,
	ctx: GpuScaleContext
): void {
	const view = new DataView(buffer, offset, SCALE_CONTEXT_BYTE_SIZE);
	view.setFloat32(0, ctx.camera_altitude_meters, true);
	view.setFloat32(4, ctx.distance_to_camera_meters, true);
	view.setFloat32(8, ctx.meters_per_pixel, true);
	view.setFloat32(12, ctx.max_feature_frequency, true);
	view.setUint32(16, ctx.mode, true);
	view.setUint32(20, ctx._pad0, true);
	view.setUint32(24, ctx._pad1, true);
	view.setUint32(28, ctx._pad2, true);
}

export function writeLocalFrameToBuffer(
	buffer: ArrayBuffer,
	offset: number,
	frame: GpuLocalFrame
): void {
	const view = new DataView(buffer, offset, LOCAL_FRAME_BYTE_SIZE);
	const writeVec4 = (base: number, v: [number, number, number, number]) => {
		view.setFloat32(base, v[0], true);
		view.setFloat32(base + 4, v[1], true);
		view.setFloat32(base + 8, v[2], true);
		view.setFloat32(base + 12, v[3], true);
	};
	writeVec4(0, frame.origin_ecef);
	writeVec4(16, frame.east);
	writeVec4(32, frame.north);
	writeVec4(48, frame.up);
	writeVec4(64, frame.planet_center_local);
	writeVec4(80, frame.camera_local);
}

/**
 * Write one cube-sphere patch GPU record (CUBE_SPHERE_PATCH_BYTE_SIZE bytes) at
 * `offset`. Shared by the object encoder and the flat-buffer packer so both
 * produce byte-identical layout. Layout: face:u32, uvMin:vec2f, uvMax:vec2f,
 * resolution:u32, morph:f32, pad:u32.
 */
export function writeCubePatchRecord(
	view: DataView,
	offset: number,
	face: number,
	uvMinX: number,
	uvMinY: number,
	uvMaxX: number,
	uvMaxY: number,
	resolution: number,
	morph: number
): void {
	view.setUint32(offset, face, true);
	view.setFloat32(offset + 4, uvMinX, true);
	view.setFloat32(offset + 8, uvMinY, true);
	view.setFloat32(offset + 12, uvMaxX, true);
	view.setFloat32(offset + 16, uvMaxY, true);
	view.setUint32(offset + 20, resolution, true);
	view.setFloat32(offset + 24, morph, true);
	view.setUint32(offset + 28, 0, true);
}

export function encodeCubeSpherePatches(
	patches: CubeSpherePatch[],
	target?: ArrayBuffer
): ArrayBuffer {
	const byteLength = patches.length * CUBE_SPHERE_PATCH_BYTE_SIZE;
	const data =
		target && target.byteLength >= byteLength ? target : new ArrayBuffer(byteLength);
	const view = new DataView(data, 0, byteLength);
	for (let i = 0; i < patches.length; i++) {
		const p = patches[i];
		writeCubePatchRecord(
			view,
			i * CUBE_SPHERE_PATCH_BYTE_SIZE,
			p.face,
			p.uvMin[0],
			p.uvMin[1],
			p.uvMax[0],
			p.uvMax[1],
			p.resolution,
			p.morph
		);
	}
	return data;
}

/** Upload a pre-packed bucket's bytes straight to a GPU buffer (no re-encode). */
export function uploadPackedBucket(
	device: GPUDevice,
	buffer: GPUBuffer,
	data: Uint8Array,
	byteOffset = 0
): void {
	if (data.byteLength === 0) return;
	device.queue.writeBuffer(buffer, byteOffset, data, 0, data.byteLength);
}

let patchUploadStaging: ArrayBuffer | null = null;

export function uploadCubeSpherePatches(
	device: GPUDevice,
	buffer: GPUBuffer,
	patches: CubeSpherePatch[],
	byteOffset = 0
): void {
	if (patches.length === 0) return;
	const byteLength = patches.length * CUBE_SPHERE_PATCH_BYTE_SIZE;
	if (!patchUploadStaging || patchUploadStaging.byteLength < byteLength) {
		patchUploadStaging = new ArrayBuffer(Math.max(byteLength, CUBE_PATCH_RING_BYTES));
	}
	const data = encodeCubeSpherePatches(patches, patchUploadStaging);
	device.queue.writeBuffer(buffer, byteOffset, data, 0, byteLength);
}

export function createCubeSpherePatchRingBuffer(device: GPUDevice): GPUBuffer {
	return device.createBuffer({
		size: Math.max(CUBE_PATCH_RING_BYTES, CUBE_SPHERE_PATCH_BYTE_SIZE),
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
	});
}

/** @deprecated Use uploadCubeSpherePatches with a ring buffer. */
export function writeCubeSpherePatchesToBuffer(
	patches: CubeSpherePatch[],
	device: GPUDevice
): GPUBuffer {
	const buffer = createCubeSpherePatchRingBuffer(device);
	uploadCubeSpherePatches(device, buffer, patches);
	return buffer;
}

export const SURFACE_PATCH_BYTE_SIZE = 32;
// Ring capacity: buildSurfacePatchRings caps out near 4*R(R-1)+1 patches for R
// rings (~225 at the default R=8); 1024 leaves generous headroom.
export const MAX_SURFACE_PATCHES = 1024;
export const SURFACE_PATCH_RING_BYTES = MAX_SURFACE_PATCHES * SURFACE_PATCH_BYTE_SIZE;

/**
 * Write one surface-patch GPU record (SURFACE_PATCH_BYTE_SIZE bytes) at `offset`.
 * Layout: origin:vec2f, sizeMeters:f32, resolution:u32, ring:u32,
 * maxFeatureMeters:f32, morph:f32, pad:u32.
 */
export function writeSurfacePatchRecord(
	view: DataView,
	offset: number,
	originX: number,
	originY: number,
	sizeMeters: number,
	resolution: number,
	ring: number,
	maxFeatureMeters: number,
	morph: number
): void {
	view.setFloat32(offset, originX, true);
	view.setFloat32(offset + 4, originY, true);
	view.setFloat32(offset + 8, sizeMeters, true);
	view.setUint32(offset + 12, resolution, true);
	view.setUint32(offset + 16, ring, true);
	view.setFloat32(offset + 20, maxFeatureMeters, true);
	view.setFloat32(offset + 24, morph, true);
	view.setUint32(offset + 28, 0, true);
}

export function createSurfacePatchRingBuffer(device: GPUDevice): GPUBuffer {
	return device.createBuffer({
		size: Math.max(SURFACE_PATCH_RING_BYTES, SURFACE_PATCH_BYTE_SIZE),
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
	});
}

let surfaceUploadStaging: ArrayBuffer | null = null;

/**
 * Encode surface patches and upload to a persistent ring buffer (no per-frame
 * GPU buffer allocation). Caps at MAX_SURFACE_PATCHES; returns the uploaded count.
 */
export function uploadSurfacePatches(
	device: GPUDevice,
	buffer: GPUBuffer,
	patches: SurfacePatch[],
	byteOffset = 0
): number {
	const count = Math.min(patches.length, MAX_SURFACE_PATCHES);
	if (count === 0) return 0;
	const byteLength = count * SURFACE_PATCH_BYTE_SIZE;
	if (!surfaceUploadStaging || surfaceUploadStaging.byteLength < byteLength) {
		surfaceUploadStaging = new ArrayBuffer(Math.max(byteLength, SURFACE_PATCH_RING_BYTES));
	}
	const view = new DataView(surfaceUploadStaging, 0, byteLength);
	for (let i = 0; i < count; i++) {
		const p = patches[i];
		writeSurfacePatchRecord(
			view,
			i * SURFACE_PATCH_BYTE_SIZE,
			p.originLocalMeters[0],
			p.originLocalMeters[1],
			p.sizeMeters,
			p.resolution,
			p.ring,
			p.maxFeatureMeters,
			p.morph
		);
	}
	device.queue.writeBuffer(buffer, byteOffset, surfaceUploadStaging, 0, byteLength);
	return count;
}

export function createPlanetParamsBuffer(device: GPUDevice): GPUBuffer {
	return device.createBuffer({
		size: PLANET_PARAMS_BYTE_SIZE,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});
}

export function createScaleContextBuffer(device: GPUDevice): GPUBuffer {
	return device.createBuffer({
		size: SCALE_CONTEXT_BYTE_SIZE,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});
}

export function createLocalFrameBuffer(device: GPUDevice): GPUBuffer {
	return device.createBuffer({
		size: LOCAL_FRAME_BYTE_SIZE,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});
}

export function uploadPlanetParams(
	device: GPUDevice,
	buffer: GPUBuffer,
	params: GpuPlanetParams
): void {
	const staging = new ArrayBuffer(PLANET_PARAMS_BYTE_SIZE);
	writePlanetParamsToBuffer(staging, 0, params);
	device.queue.writeBuffer(buffer, 0, staging);
}
