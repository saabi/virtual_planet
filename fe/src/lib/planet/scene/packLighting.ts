import type { CollectedLighting, SceneLight } from '../scene/types.js';
import {
	MAX_GPU_LIGHTS,
	type GpuLightPacked,
	type LightingUniforms
} from '../render/uniformLayouts.js';

export function packSceneLighting(collected: CollectedLighting): LightingUniforms {
	const lights: GpuLightPacked[] = [];
	for (let i = 0; i < Math.min(collected.lights.length, MAX_GPU_LIGHTS); i++) {
		lights.push(packSceneLight(collected.lights[i]));
	}
	return {
		ambient: [collected.ambient[0], collected.ambient[1], collected.ambient[2], 1],
		lightCount: lights.length,
		lights
	};
}

/**
 * Rotate light directions/positions about the +Y (polar) axis. Rotating the
 * camera and the lights together by −angle simulates the planet spinning by
 * +angle on its axis with the sun fixed (the body terrain stays put in world).
 */
export function rotateLightingAroundY(
	lighting: LightingUniforms,
	angleRad: number
): LightingUniforms {
	if (angleRad === 0) return lighting;
	const c = Math.cos(angleRad);
	const s = Math.sin(angleRad);
	return {
		...lighting,
		lights: lighting.lights.map((l) => {
			const [x, y, z, w] = l.positionOrDir;
			return { ...l, positionOrDir: [x * c + z * s, y, -x * s + z * c, w] };
		})
	};
}

function packSceneLight(light: SceneLight): GpuLightPacked {
	if (light.kind === 'directional') {
		const d = light.directionOrPosition;
		return {
			positionOrDir: [d[0], d[1], d[2], 0],
			color: [light.color[0], light.color[1], light.color[2], light.intensity],
			params: [0, 0, 0, 0]
		};
	}
	const p = light.directionOrPosition;
	return {
		positionOrDir: [p[0], p[1], p[2], 1],
		color: [light.color[0], light.color[1], light.color[2], light.intensity],
		params: [light.range, 0, 0, 0]
	};
}
