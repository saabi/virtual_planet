/**
 * Vitest setup: install a Node WebGPU binding when `navigator.gpu` is absent.
 *
 * Headless Linux / WSL2 also needs a software Vulkan ICD (Mesa lavapipe). See
 * packages/runtime-webgpu/README.md §Device-compile tests.
 */
async function installNodeWebGpu(): Promise<void> {
	if (
		typeof globalThis.navigator !== 'undefined' &&
		'gpu' in globalThis.navigator &&
		globalThis.navigator.gpu
	) {
		return;
	}

	try {
		const { create, globals } = await import('webgpu');
		Object.assign(globalThis, globals);
		const navigatorRef = globalThis.navigator ?? ({} as Navigator);
		if (!globalThis.navigator) {
			Object.defineProperty(globalThis, 'navigator', {
				value: navigatorRef,
				configurable: true,
				writable: true
			});
		}
		navigatorRef.gpu = create([]);
	} catch {
		// Optional devDependency — tests skip when the binding is not installed.
	}
}

await installNodeWebGpu();

if (process.env.REQUIRE_WEBGPU === '1') {
	const gpu = globalThis.navigator?.gpu;
	if (!gpu) {
		throw new Error(
			'REQUIRE_WEBGPU=1 but navigator.gpu is unavailable. Install the webgpu devDependency and, on headless Linux/WSL2, Mesa lavapipe (see runtime-webgpu README).'
		);
	}
	const adapter = await gpu.requestAdapter();
	if (!adapter) {
		throw new Error(
			'REQUIRE_WEBGPU=1 but requestAdapter() returned null. On headless Linux/WSL2 set VK_ICD_FILENAMES to Mesa lavapipe (see runtime-webgpu README).'
		);
	}
}
