import { generateWgsl, sliceGraph, type GeneratedWgsl, type WgslModuleResolver } from '@virtual-planet/compiler';
import type { GraphDocument, PortRef } from '@virtual-planet/graph';

import { alignTo, createStorageBuffer } from '../buffers.js';
import {
	buildParamsStructWgsl,
	emitGraphScalarEval,
	emitGraphVec3Eval,
	type GraphParamField
} from '../emitGraphEval.js';
import { createStandardLibraryResolver } from '../moduleResolver.js';
import {
	decodeVegetationCandidates,
	vegetationCandidateBufferByteLength,
	VEGETATION_CANDIDATE_STRIDE
} from '../vegetationBuffer.js';
import {
	computeVegetationGridSize,
	type VegetationCandidateComputeInput,
	type VegetationCandidateComputeResult,
	type VegetationCandidateConfig,
	type VegetationPatch
} from '../vegetationTypes.js';

const PATCH_UNIFORM_BYTE_LENGTH = 112;
const META_BYTE_LENGTH = 16;
const TANGENT_EPSILON = 1e-5;

export type VegetationCandidateComputeOptions = VegetationCandidateComputeInput & {
	moduleResolver?: WgslModuleResolver;
};

function finite(value: number, label: string): number {
	if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite`);
	return value;
}

function validateVector(vector: readonly [number, number, number], label: string): void {
	for (let index = 0; index < 3; index += 1) {
		finite(vector[index], `${label}[${index}]`);
	}
}

function validateChannel(channel: number): void {
	if (!Number.isInteger(channel) || channel < 0 || channel > 2) {
		throw new RangeError('channel must be 0, 1, or 2');
	}
}

function length(vector: readonly [number, number, number]): number {
	return Math.hypot(vector[0], vector[1], vector[2]);
}

function dot(
	a: readonly [number, number, number],
	b: readonly [number, number, number]
): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function validatePatch(patch: VegetationPatch): void {
	validateVector(patch.origin, 'origin');
	validateVector(patch.tangentX, 'tangentX');
	validateVector(patch.tangentY, 'tangentY');
	if (finite(patch.widthMeters, 'widthMeters') <= 0) {
		throw new RangeError('widthMeters must be positive');
	}
	if (finite(patch.heightMeters, 'heightMeters') <= 0) {
		throw new RangeError('heightMeters must be positive');
	}
	if (Math.abs(length(patch.tangentX) - 1) > TANGENT_EPSILON) {
		throw new RangeError('tangentX must be a unit vector');
	}
	if (Math.abs(length(patch.tangentY) - 1) > TANGENT_EPSILON) {
		throw new RangeError('tangentY must be a unit vector');
	}
	if (Math.abs(dot(patch.tangentX, patch.tangentY)) > TANGENT_EPSILON) {
		throw new RangeError('patch tangents must be orthogonal');
	}
}

function validateConfig(config: VegetationCandidateConfig): void {
	validateChannel(config.channel);
	if (finite(config.spacingMeters, 'spacingMeters') <= 0) {
		throw new RangeError('spacingMeters must be positive');
	}
	for (const [label, value] of [
		['placementThreshold', config.placementThreshold],
		['densityThreshold', config.densityThreshold]
	] as const) {
		finite(value, label);
		if (value < 0 || value > 1) throw new RangeError(`${label} must be in [0,1]`);
	}
	if (finite(config.minProminence, 'minProminence') < 0) {
		throw new RangeError('minProminence must be non-negative');
	}
	if (config.maxSlope !== undefined && finite(config.maxSlope, 'maxSlope') < 0) {
		throw new RangeError('maxSlope must be non-negative');
	}
	if (config.minAltitudeMeters !== undefined) {
		finite(config.minAltitudeMeters, 'minAltitudeMeters');
	}
	if (config.maxAltitudeMeters !== undefined) {
		finite(config.maxAltitudeMeters, 'maxAltitudeMeters');
	}
	if (
		config.minAltitudeMeters !== undefined &&
		config.maxAltitudeMeters !== undefined &&
		config.minAltitudeMeters > config.maxAltitudeMeters
	) {
		throw new RangeError('minAltitudeMeters may not exceed maxAltitudeMeters');
	}
}

function findOutputName(doc: GraphDocument, output: PortRef): string {
	const match = doc.outputs.find(
		(candidate) => candidate.from.node === output.node && candidate.from.port === output.port
	);
	if (!match) {
		throw new Error(`Output port is not declared in graph.outputs: ${output.node}.${output.port}`);
	}
	return match.name;
}

function mergeGraphParamFields(
	densityFields: GraphParamField[],
	placementFields: GraphParamField[]
): GraphParamField[] {
	const merged: GraphParamField[] = [];
	const seen = new Set<string>();
	for (const field of [...densityFields, ...placementFields]) {
		if (seen.has(field.field)) {
			throw new RangeError(`Duplicate graph param field: ${field.field}`);
		}
		seen.add(field.field);
		merged.push(field);
	}
	return merged;
}

function packGraphParams(
	fields: GraphParamField[],
	graphs: GraphDocument[]
): Float32Array {
	const values = [0, 0];
	for (const field of fields) {
		const doc = graphs.find((graph) => graph.nodes.some((node) => node.id === field.nodeId));
		if (!doc) {
			values.push(field.defaultValue);
			continue;
		}
		const node = doc.nodes.find((candidate) => candidate.id === field.nodeId);
		if (!node) {
			values.push(field.defaultValue);
			continue;
		}
		const params = node.params ?? {};
		const value = params[field.paramName];
		values.push(typeof value === 'number' ? value : field.defaultValue);
	}
	return new Float32Array(values);
}

async function mergeModuleSources(
	densityGenerated: GeneratedWgsl,
	placementGenerated: GeneratedWgsl,
	resolver: WgslModuleResolver
): Promise<string> {
	const moduleIds: string[] = [];
	const seen = new Set<string>();
	for (const id of [...densityGenerated.moduleIds, ...placementGenerated.moduleIds]) {
		if (seen.has(id)) continue;
		seen.add(id);
		moduleIds.push(id);
	}
	const sources: string[] = [];
	for (const id of moduleIds) {
		sources.push((await resolver.resolve(id)).source);
	}
	return sources.join('\n\n');
}

function packPatchUniforms(
	patch: VegetationPatch,
	config: VegetationCandidateConfig,
	gridWidth: number,
	gridHeight: number,
	maxCandidates: number
): ArrayBuffer {
	const buffer = new ArrayBuffer(PATCH_UNIFORM_BYTE_LENGTH);
	const view = new DataView(buffer);
	let offset = 0;

	for (let component = 0; component < 3; component += 1) {
		view.setFloat32(offset + component * 4, patch.origin[component], true);
	}
	offset += 16;

	for (let component = 0; component < 3; component += 1) {
		view.setFloat32(offset + component * 4, patch.tangentX[component], true);
	}
	offset += 16;

	for (let component = 0; component < 3; component += 1) {
		view.setFloat32(offset + component * 4, patch.tangentY[component], true);
	}
	offset += 16;

	view.setFloat32(offset, patch.widthMeters, true);
	view.setFloat32(offset + 4, patch.heightMeters, true);
	view.setFloat32(offset + 8, config.spacingMeters, true);
	offset += 12;

	view.setUint32(offset, gridWidth, true);
	view.setUint32(offset + 4, gridHeight, true);
	view.setUint32(offset + 8, config.channel, true);
	offset += 12;

	view.setFloat32(offset, config.placementThreshold, true);
	view.setFloat32(offset + 4, config.densityThreshold, true);
	view.setFloat32(offset + 8, config.minProminence, true);
	offset += 12;

	const disabled = Number.NaN;
	view.setFloat32(offset, config.minAltitudeMeters ?? disabled, true);
	view.setFloat32(offset + 4, config.maxAltitudeMeters ?? disabled, true);
	view.setFloat32(offset + 8, config.maxSlope ?? disabled, true);
	offset += 12;

	view.setUint32(offset, maxCandidates, true);
	return buffer;
}

function buildComputeShader(
	moduleCode: string,
	paramsStruct: string,
	densityBody: string[],
	densityResultExpr: string,
	placementBody: string[],
	placementResultExpr: string
): string {
	return `${moduleCode}

struct VegetationPatchParams {
	origin: vec3<f32>,
	_pad0: f32,
	tangent_x: vec3<f32>,
	_pad1: f32,
	tangent_y: vec3<f32>,
	_pad2: f32,
	width_meters: f32,
	height_meters: f32,
	spacing_meters: f32,
	grid_width: u32,
	grid_height: u32,
	channel: u32,
	placement_threshold: f32,
	density_threshold: f32,
	min_prominence: f32,
	min_altitude_meters: f32,
	max_altitude_meters: f32,
	max_slope: f32,
	max_candidates: u32,
}

struct VegetationCandidateGpu {
	ix: u32,
	iy: u32,
	channel: u32,
	_pad0: u32,
	position: vec3<f32>,
	_pad1: f32,
	local_meters: vec2<f32>,
	density: vec3<f32>,
	placement: f32,
	prominence: f32,
	vigor: f32,
}

struct VegetationResultMeta {
	candidate_count: atomic<u32>,
	overflowed: atomic<u32>,
	_pad0: u32,
	_pad1: u32,
}

${paramsStruct}

@group(0) @binding(0) var<uniform> patch_params: VegetationPatchParams;
@group(0) @binding(1) var<uniform> graph_params: GraphParams;
@group(0) @binding(2) var<storage, read_write> meta: VegetationResultMeta;
@group(0) @binding(3) var<storage, read_write> candidates: array<VegetationCandidateGpu>;

fn evaluate_density(position: vec3<f32>) -> vec3<f32> {
${densityBody.map((line) => `\t${line}`).join('\n')}
\treturn ${densityResultExpr};
}

fn evaluate_placement(position: vec3<f32>) -> f32 {
${placementBody.map((line) => `\t${line}`).join('\n')}
\treturn ${placementResultExpr};
}

fn patch_position(x: f32, y: f32) -> vec3<f32> {
	return patch_params.origin + patch_params.tangent_x * x + patch_params.tangent_y * y;
}

fn append_candidate(record: VegetationCandidateGpu) {
	let cap = patch_params.max_candidates;
	loop {
		let index = atomicLoad(&meta.candidate_count);
		if (index >= cap) {
			atomicStore(&meta.overflowed, 1u);
			return;
		}
		let exchanged = atomicCompareExchangeWeak(&meta.candidate_count, index, index + 1u);
		if (exchanged.exchanged) {
			candidates[index] = record;
			return;
		}
	}
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
	let ix = gid.x;
	let iy = gid.y;
	if (ix >= patch_params.grid_width || iy >= patch_params.grid_height) {
		return;
	}

	let spacing = patch_params.spacing_meters;
	let x = (f32(ix) + 0.5) * spacing;
	let y = (f32(iy) + 0.5) * spacing;
	if (x >= patch_params.width_meters || y >= patch_params.height_meters) {
		return;
	}

	let position = patch_position(x, y);
	let center = evaluate_placement(position);
	let neighbor_xp = evaluate_placement(patch_position(x + spacing, y));
	let neighbor_xn = evaluate_placement(patch_position(x - spacing, y));
	let neighbor_yp = evaluate_placement(patch_position(x, y + spacing));
	let neighbor_yn = evaluate_placement(patch_position(x, y - spacing));

	if (!(center > neighbor_xp && center > neighbor_xn && center > neighbor_yp && center > neighbor_yn)) {
		return;
	}

	let neighbor_max = max(max(neighbor_xp, neighbor_xn), max(neighbor_yp, neighbor_yn));
	let prominence = center - neighbor_max;
	if (prominence < patch_params.min_prominence || center < patch_params.placement_threshold) {
		return;
	}

	let density = evaluate_density(position);
	let channel = patch_params.channel;
	let density_components = array<f32, 3>(density.x, density.y, density.z);
	let selected_density = density_components[channel];
	if (selected_density < patch_params.density_threshold) {
		return;
	}

	let placement_vigor = clamp(
		(center - patch_params.placement_threshold) / max(1e-9, 1.0 - patch_params.placement_threshold),
		0.0,
		1.0
	);
	let vigor = clamp(placement_vigor * selected_density, 0.0, 1.0);

	append_candidate(VegetationCandidateGpu(
		ix,
		iy,
		channel,
		0u,
		position,
		0.0,
		vec2<f32>(x, y),
		density,
		center,
		prominence,
		vigor
	));
}
`;
}

async function createComputePipeline(device: GPUDevice, shaderCode: string): Promise<GPUComputePipeline> {
	const module = device.createShaderModule({ label: 'vegetation-candidates', code: shaderCode });
	return device.createComputePipeline({
		label: 'vegetation-candidates',
		layout: 'auto',
		compute: { module, entryPoint: 'main' }
	});
}

export async function executeVegetationCandidateCompute(
	input: VegetationCandidateComputeOptions
): Promise<VegetationCandidateComputeResult> {
	const { device, patch, config, density, placement, maxCandidates, moduleResolver } = input;

	validatePatch(patch);
	validateConfig(config);
	if (!Number.isInteger(maxCandidates) || maxCandidates < 0) {
		throw new RangeError('maxCandidates must be a non-negative integer');
	}

	const { gridWidth, gridHeight } = computeVegetationGridSize(patch, config.spacingMeters);
	const resolver = moduleResolver ?? createStandardLibraryResolver();

	const densityOutputName = findOutputName(density.graph, density.output);
	const placementOutputName = findOutputName(placement.graph, placement.output);
	const densitySlice = sliceGraph(density.graph, { outputs: [densityOutputName] });
	const placementSlice = sliceGraph(placement.graph, { outputs: [placementOutputName] });

	const [densityGenerated, placementGenerated] = await Promise.all([
		generateWgsl(densitySlice, resolver),
		generateWgsl(placementSlice, resolver)
	]);

	const densityEmitted = emitGraphVec3Eval(density.graph, density.output, { positionExpr: 'position' });
	const placementEmitted = emitGraphScalarEval(placement.graph, placement.output, {
		positionExpr: 'position'
	});
	const mergedParams = mergeGraphParamFields(densityEmitted.params, placementEmitted.params);
	const moduleCode = await mergeModuleSources(densityGenerated, placementGenerated, resolver);
	const paramsStruct = buildParamsStructWgsl(mergedParams);
	const shaderCode = buildComputeShader(
		moduleCode,
		paramsStruct,
		densityEmitted.body,
		densityEmitted.resultExpr,
		placementEmitted.body,
		placementEmitted.resultExpr
	);

	const pipeline = await createComputePipeline(device, shaderCode);
	const bindGroupLayout = pipeline.getBindGroupLayout(0);

	const patchUniformBuffer = device.createBuffer({
		label: 'vegetation-patch-uniforms',
		size: alignTo(PATCH_UNIFORM_BYTE_LENGTH, 16),
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});
	device.queue.writeBuffer(
		patchUniformBuffer,
		0,
		packPatchUniforms(patch, config, gridWidth, gridHeight, maxCandidates)
	);

	const graphUniformData = packGraphParams(mergedParams, [density.graph, placement.graph]);
	const graphUniformBuffer = device.createBuffer({
		label: 'vegetation-graph-uniforms',
		size: alignTo(graphUniformData.byteLength, 16),
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});
	device.queue.writeBuffer(
		graphUniformBuffer,
		0,
		graphUniformData.buffer,
		graphUniformData.byteOffset,
		graphUniformData.byteLength
	);

	const metaBuffer = createStorageBuffer(device, {
		label: 'vegetation-meta',
		size: META_BYTE_LENGTH,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
	});
	device.queue.writeBuffer(metaBuffer, 0, new Uint32Array(4));

	const candidateBytes = vegetationCandidateBufferByteLength(maxCandidates);
	const candidatesBuffer = createStorageBuffer(device, {
		label: 'vegetation-candidates',
		size: Math.max(candidateBytes, VEGETATION_CANDIDATE_STRIDE),
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
	});

	const bindGroup = device.createBindGroup({
		layout: bindGroupLayout,
		entries: [
			{ binding: 0, resource: { buffer: patchUniformBuffer } },
			{ binding: 1, resource: { buffer: graphUniformBuffer } },
			{ binding: 2, resource: { buffer: metaBuffer } },
			{ binding: 3, resource: { buffer: candidatesBuffer } }
		]
	});

	const encoder = device.createCommandEncoder({ label: 'vegetation-candidates' });
	const pass = encoder.beginComputePass({ label: 'vegetation-candidates' });
	pass.setPipeline(pipeline);
	pass.setBindGroup(0, bindGroup);
	pass.dispatchWorkgroups(Math.ceil(gridWidth / 8), Math.ceil(gridHeight / 8), 1);
	pass.end();

	const metaReadback = device.createBuffer({
		label: 'vegetation-meta-readback',
		size: META_BYTE_LENGTH,
		usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
	});
	const candidateReadbackBytes = Math.max(candidateBytes, VEGETATION_CANDIDATE_STRIDE);
	const candidatesReadback = device.createBuffer({
		label: 'vegetation-candidates-readback',
		size: candidateReadbackBytes,
		usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
	});
	encoder.copyBufferToBuffer(metaBuffer, 0, metaReadback, 0, META_BYTE_LENGTH);
	encoder.copyBufferToBuffer(candidatesBuffer, 0, candidatesReadback, 0, candidateReadbackBytes);
	device.queue.submit([encoder.finish()]);

	await metaReadback.mapAsync(GPUMapMode.READ);
	const metaView = new DataView(metaReadback.getMappedRange().slice(0));
	metaReadback.unmap();
	const rawCount = metaView.getUint32(0, true);
	const overflowed = metaView.getUint32(4, true) === 1;
	const candidateCount = Math.min(rawCount, maxCandidates);

	await candidatesReadback.mapAsync(GPUMapMode.READ);
	const candidateData = candidatesReadback.getMappedRange().slice(0);
	candidatesReadback.unmap();

	patchUniformBuffer.destroy();
	graphUniformBuffer.destroy();
	metaBuffer.destroy();
	candidatesBuffer.destroy();
	metaReadback.destroy();
	candidatesReadback.destroy();

	return {
		patchId: patch.id,
		gridWidth,
		gridHeight,
		candidateCount,
		overflowed,
		candidates: decodeVegetationCandidates(candidateData, candidateCount)
	};
}
