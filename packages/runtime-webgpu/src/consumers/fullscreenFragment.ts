import { assembleStageEntry, compileGraph, type WgslModuleResolver } from '@virtual-planet/compiler';
import type { GraphDocument, PortRef, ProceduralConsumer } from '@virtual-planet/graph';

import { alignTo, rgba8BufferByteLength } from '../buffers.js';
import { emitGraphVec4Eval } from '../emitGraphEval.js';
import { createStandardLibraryResolver } from '../moduleResolver.js';
import {
	packShaderToyUniforms,
	SHADERTOY_UNIFORM_BYTE_LENGTH,
	SHADERTOY_UNIFORM_STRUCT_WGSL
} from './shadertoyUniforms.js';

export interface ShaderToyHostInputs {
	iTime: number;
	iFrame?: number;
	/** Normalized pointer (xy in [0,1], zw click) — from the preview surface, not a buffer. */
	iMouse?: [number, number, number, number];
}

export interface FullscreenFragmentInput {
	device: GPUDevice;
	graph: GraphDocument;
	output: PortRef;
	resolver?: WgslModuleResolver;
	width: number;
	height: number;
	host: ShaderToyHostInputs;
}

export interface FullscreenFragmentResult {
	width: number;
	height: number;
	pixels: Uint8Array;
}

const FULLSCREEN_VERTEX_WGSL = `struct VSOut {
	@builtin(position) position: vec4f,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
	var out: VSOut;
	let x = f32((vid << 1u) & 2u);
	let y = f32(vid & 2u);
	out.position = vec4f(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
	return out;
}`;

function findOutputName(doc: GraphDocument, output: PortRef): string {
	const match = doc.outputs.find(
		(candidate) => candidate.from.node === output.node && candidate.from.port === output.port
	);
	if (!match) {
		throw new Error(`Output port is not declared in graph.outputs: ${output.node}.${output.port}`);
	}
	return match.name;
}

function buildGraphEvalFn(outputName: string, body: string[], resultExpr: string): string {
	return `fn graph_eval_${outputName}() -> vec4f {
${body.map((line) => `\t${line}`).join('\n')}
\treturn ${resultExpr};
}`;
}

export async function assembleFullscreenFragmentModuleAsync(
	graph: GraphDocument,
	output: PortRef,
	resolver: WgslModuleResolver,
	consumer: ProceduralConsumer = { type: 'image', id: 'image', stage: 'fragment', outputs: [] }
): Promise<{ code: string; outputName: string }> {
	const outputName = findOutputName(graph, output);
	const consumerWithOutput: ProceduralConsumer = {
		...consumer,
		outputs: consumer.outputs.length > 0 ? consumer.outputs : [outputName]
	};

	const compiled = await compileGraph(graph, resolver, { consumers: [consumerWithOutput] });
	const consumerShader = compiled.shaders[0];
	if (!consumerShader) {
		throw new Error('compileGraph produced no shaders');
	}

	const emitted = emitGraphVec4Eval(graph, output, { shaderToy: true });
	const evalFn = buildGraphEvalFn(outputName, emitted.body, emitted.resultExpr);
	const libraryWithEval = `${consumerShader.code}\n\n${evalFn}`;

	const stage = assembleStageEntry(
		{ ...consumerShader, code: libraryWithEval },
		{
			bindings: [
				{
					group: 0,
					binding: 0,
					name: 'u',
					kind: 'uniform',
					wgslType: 'ShaderToyUniforms'
				}
			],
			outputFns: { [outputName]: `graph_eval_${outputName}` },
			callArgs: []
		}
	);

	const code = [SHADERTOY_UNIFORM_STRUCT_WGSL, FULLSCREEN_VERTEX_WGSL, stage.code].join('\n\n');

	return { code, outputName };
}

async function createRenderPipeline(device: GPUDevice, shaderCode: string): Promise<GPURenderPipeline> {
	const module = device.createShaderModule({ label: 'fullscreen-fragment', code: shaderCode });
	return device.createRenderPipeline({
		label: 'fullscreen-fragment',
		layout: 'auto',
		vertex: { module, entryPoint: 'vs_main' },
		fragment: {
			module,
			entryPoint: 'fs_main',
			targets: [{ format: 'rgba8unorm' }]
		},
		primitive: { topology: 'triangle-list' }
	});
}

export async function executeFullscreenFragment(
	input: FullscreenFragmentInput
): Promise<FullscreenFragmentResult> {
	const { device, graph, output, width, height, host } = input;
	if (width <= 0 || height <= 0) {
		throw new RangeError('width and height must be positive');
	}

	const resolver = input.resolver ?? createStandardLibraryResolver();
	const { code } = await assembleFullscreenFragmentModuleAsync(graph, output, resolver);
	const pipeline = await createRenderPipeline(device, code);
	const bindGroupLayout = pipeline.getBindGroupLayout(0);

	const uniformData = packShaderToyUniforms({
		width,
		height,
		iTime: host.iTime,
		iMouse: host.iMouse,
		iFrame: host.iFrame
	});
	const uniformBuffer = device.createBuffer({
		label: 'shadertoy-uniforms',
		size: alignTo(SHADERTOY_UNIFORM_BYTE_LENGTH, 16),
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	});
	device.queue.writeBuffer(uniformBuffer, 0, uniformData);

	const bindGroup = device.createBindGroup({
		layout: bindGroupLayout,
		entries: [{ binding: 0, resource: { buffer: uniformBuffer } }]
	});

	const texture = device.createTexture({
		label: 'fullscreen-fragment-target',
		size: { width, height },
		format: 'rgba8unorm',
		usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
	});

	const encoder = device.createCommandEncoder({ label: 'fullscreen-fragment' });
	const pass = encoder.beginRenderPass({
		label: 'fullscreen-fragment',
		colorAttachments: [
			{
				view: texture.createView(),
				loadOp: 'clear',
				storeOp: 'store',
				clearValue: { r: 0, g: 0, b: 0, a: 1 }
			}
		]
	});
	pass.setPipeline(pipeline);
	pass.setBindGroup(0, bindGroup);
	pass.draw(3);
	pass.end();

	const pixelBytes = rgba8BufferByteLength(width, height);
	const bytesPerRow = alignTo(width * 4, 256);
	const paddedBytes = bytesPerRow * height;
	const readbackBuffer = device.createBuffer({
		label: 'fullscreen-fragment-readback',
		size: paddedBytes,
		usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
	});
	encoder.copyTextureToBuffer(
		{ texture },
		{ buffer: readbackBuffer, bytesPerRow, rowsPerImage: height },
		{ width, height }
	);
	device.queue.submit([encoder.finish()]);

	await readbackBuffer.mapAsync(GPUMapMode.READ);
	const mapped = new Uint8Array(readbackBuffer.getMappedRange());
	const pixels = new Uint8Array(pixelBytes);
	const rowBytes = width * 4;
	for (let y = 0; y < height; y++) {
		pixels.set(mapped.subarray(y * bytesPerRow, y * bytesPerRow + rowBytes), y * rowBytes);
	}
	readbackBuffer.unmap();

	uniformBuffer.destroy();
	texture.destroy();
	readbackBuffer.destroy();

	return { width, height, pixels };
}
