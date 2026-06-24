import {
	focusedBodyCamera,
	type OrbitLookMode
} from '../camera/orbitCamera.js';
import type { CameraState } from '../camera/cameraModes.js';
import {
	bodyRelativeCameraFromOrbit,
	bodyRelativeCameraFromWorld,
	type OrbitCamera
} from './orbitCamera.js';
import { fadeOpacity, resolveBodyParams } from '../scene/bodyParams.js';
import { resolveBodyAtmosphere, bodyAtmosphereToParameters } from '../scene/bodyAtmosphere.js';
import { DEFAULT_TESSELLATION, type TessellationSettings } from '../patches/tessellationSettings.js';
import { DEFAULT_MATERIAL_OVERRIDES, type MaterialDebugMode } from '../material/biomes.js';
import type { SceneViewportPrefs } from '../scene/viewportPrefs.js';
import type { PlanetRenderInputs } from '../render/planetRenderer.js';
import type { LightingUniforms } from '../render/uniformLayouts.js';
import type { BodyNode, Quat } from '../scene/types.js';
import { len3, sub3, type Vec3 } from '../math/vec.js';
import { scaleTessellationBudget } from './proceduralBodies.js';

// Build the per-frame input for rendering a scene body procedurally — the world-scale
// params, the shared focused-body camera, body atmosphere, and scene lighting. Extracted
// from ProceduralBodyLayer so the scene engine can render the body into its own offscreen
// layer (Phase 5) using the same inputs.

export type SceneCameraInput =
	| { mode: 'orbit'; camera: OrbitCamera; lookMode?: OrbitLookMode }
	| { mode: 'freeFly'; camera: CameraState };

export interface ProceduralRenderOpts {
	body: BodyNode;
	sceneCamera: SceneCameraInput;
	/** Body world position — required for floating-origin compositing in the scene pass. */
	bodyWorldPos: Vec3;
	width: number;
	height: number;
	time: number;
	/** Packed scene lighting (sun toward Sol, body frame). */
	lighting: LightingUniforms;
	/** Evaluated body-frame world rotation (spin/tilt) for terrain sampling. */
	planetRotation: Quat;
	/** World render radius (base radius × node scale). Defaults to body.radiusMeters. */
	renderRadius?: number;
	materialDebug?: MaterialDebugMode;
	viewportPrefs?: SceneViewportPrefs;
	/** Terrain alpha (0..1) for the sphere→terrain cross-fade; the LOD blend. Default 1. */
	blend?: number;
	/** Fraction of the viewport tessellation budget (secondary procedural bodies). */
	tessellationBudgetScale?: number;
	/** Scene-bounds-fit depth range, shared with the sphere/atmosphere passes for depth
	 *  parity. Falls back to the focused-body distance range when omitted. */
	nearFar?: [number, number];
}

function cameraTargetsBody(cam: OrbitCamera, bodyWorldPos: Vec3, planetRadius: number): boolean {
	const t = sub3(cam.target, bodyWorldPos);
	return len3(t) < planetRadius * 0.01;
}

function buildOrbitSceneCamera(
	cam: OrbitCamera,
	bodyWorldPos: Vec3,
	planetRadius: number,
	aspect: number,
	viewportHeightPx: number,
	lookMode: OrbitLookMode,
	nearFar?: [number, number]
): CameraState {
	if (cameraTargetsBody(cam, bodyWorldPos, planetRadius) && lookMode === 'horizon') {
		return focusedBodyCamera({
			azimuth: cam.azimuth,
			elevation: cam.elevation,
			distance: cam.distance,
			planetRadius,
			aspect,
			lookMode,
			near: nearFar?.[0],
			far: nearFar?.[1]
		});
	}
	return bodyRelativeCameraFromOrbit(cam, bodyWorldPos, planetRadius, aspect, viewportHeightPx, nearFar);
}

export function buildProceduralRenderInput(o: ProceduralRenderOpts): PlanetRenderInputs {
	const renderRadius = o.renderRadius ?? o.body.radiusMeters;
	const params = { ...resolveBodyParams(o.body), radius: renderRadius };
	const aspect = o.width / Math.max(o.height, 1);
	const lookMode = o.sceneCamera.mode === 'orbit' ? (o.sceneCamera.lookMode ?? 'planet-center') : 'planet-center';
	const camera =
		o.sceneCamera.mode === 'freeFly'
			? bodyRelativeCameraFromWorld(
					o.sceneCamera.camera,
					o.bodyWorldPos,
					renderRadius,
					aspect
				)
			: buildOrbitSceneCamera(
					o.sceneCamera.camera,
					o.bodyWorldPos,
					renderRadius,
					aspect,
					o.height,
					lookMode,
					o.nearFar
				);
	const prefs = o.viewportPrefs;
	const baseTessellation: TessellationSettings = prefs?.tessellation ?? DEFAULT_TESSELLATION;
	const tessScale = o.tessellationBudgetScale ?? 1;
	const tessellation =
		tessScale === 1 ? baseTessellation : scaleTessellationBudget(baseTessellation, tessScale);
	return {
		time: o.time,
		camera,
		width: o.width,
		height: o.height,
		params,
		tessellation,
		debug: prefs?.debug ?? {
			wireframe: false,
			faceColors: false,
			showPatchBorders: false,
			showRingColors: false
		},
		lighting: o.lighting,
		materialOverrides: {
			...(prefs?.materialOverrides ?? DEFAULT_MATERIAL_OVERRIDES),
			materialDebug: o.materialDebug ?? 'off',
			objectOpacity: fadeOpacity(o.blend ?? 1, prefs?.lod.fadeGamma)
		},
		atmosphere: bodyAtmosphereToParameters(
			resolveBodyAtmosphere(o.body),
			prefs?.atmosphereIntegrateSteps
		),
		planetRotation: o.planetRotation
	};
}
