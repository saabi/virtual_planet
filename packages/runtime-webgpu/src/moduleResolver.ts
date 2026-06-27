import type { WgslModule, WgslModuleResolver } from '@virtual-planet/compiler';

/** Minimal WGSL stubs for default preview-graph primitives (M10.2 gate). */
export const PREVIEW_GRAPH_WGSL_MODULES: Record<string, WgslModule> = {
	'procedural.uv': {
		id: 'procedural.uv',
		source: `fn uv_at(u: f32, v: f32) -> vec2<f32> {
	return vec2<f32>(u, v);
}`
	},
	'noise.hash': {
		id: 'noise.hash',
		source: `fn hash_mix(x: f32) -> f32 {
	return fract(sin(x) * 43758.5453123);
}`
	},
	'noise.perlin3d': {
		id: 'noise.perlin3d',
		dependencies: ['noise.hash'],
		source: `fn perlin3d(position: vec3<f32>) -> f32 {
	return hash_mix(position.x + position.y * 57.0 + position.z * 113.0);
}`
	},
	'math.remap': {
		id: 'math.remap',
		source: `fn remap(x: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
	let t = (x - inMin) / (inMax - inMin);
	return outMin + t * (outMax - outMin);
}`
	}
};

export function createMemoryModuleResolver(
	modules: Record<string, WgslModule> = PREVIEW_GRAPH_WGSL_MODULES
): WgslModuleResolver {
	return {
		async resolve(moduleId: string): Promise<WgslModule> {
			const mod = modules[moduleId];
			if (!mod) {
				throw new Error(`Unknown module: ${moduleId}`);
			}
			return mod;
		}
	};
}
