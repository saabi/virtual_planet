# @world-lab/runtime-webgpu

WebGPU runtime: buffers, pipelines, bind groups, consumers, tessellation scheduling.

## Device-compile tests

Several tests hand assembled WGSL to a real `GPUDevice` (`createShaderModule` +
`getCompilationInfo`). In Node (vitest), install the optional Dawn binding:

```sh
npm install -w @world-lab/runtime-webgpu
```

The `webgpu` package is already listed as a devDependency; `vitest.config.ts` loads
`test/webgpuSetup.ts` to attach `navigator.gpu` when absent.

### Headless Linux / WSL2

A software Vulkan ICD is required. Mesa **lavapipe** is the usual choice:

```sh
# Debian/Ubuntu
sudo apt install mesa-vulkan-drivers

# Point Vulkan at lavapipe (path varies by distro)
export VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json
# or
export VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.x86_64.json
```

Then:

```sh
cd packages/runtime-webgpu
npm test
```

When no adapter is available, device tests **skip** gracefully. To require a working adapter
(for CI or pre-merge):

```sh
REQUIRE_WEBGPU=1 npm test -w @world-lab/runtime-webgpu
```

`test/consumerDeviceCompile.test.ts` compiles representative consumer shaders (fullscreen
fragment, plane scalar, vegetation candidates, surface mesh) in one pass.
