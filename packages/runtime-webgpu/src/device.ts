export interface GpuDeviceHandle {
	adapter: GPUAdapter;
	device: GPUDevice;
}

/** Request the default WebGPU adapter and device (browser only). */
export async function requestGpuDevice(): Promise<GpuDeviceHandle> {
	if (typeof navigator === 'undefined' || !navigator.gpu) {
		throw new Error('WebGPU not available');
	}

	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) {
		throw new Error('No WebGPU adapter');
	}

	const device = await adapter.requestDevice();
	return { adapter, device };
}
