export async function requestWebGPUDevice(): Promise<{
	adapter: GPUAdapter;
	device: GPUDevice;
}> {
	if (!navigator.gpu) {
		throw new Error('WebGPU not available');
	}
	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) throw new Error('No WebGPU adapter');
	const device = await adapter.requestDevice();
	return { adapter, device };
}

export function configureWebGPUCanvas(
	device: GPUDevice,
	canvas: HTMLCanvasElement,
	format: GPUTextureFormat
): GPUCanvasContext {
	const context = canvas.getContext('webgpu');
	if (!context) throw new Error('Failed to get webgpu context');
	context.configure({
		device,
		format,
		alphaMode: 'opaque'
	});
	return context;
}
