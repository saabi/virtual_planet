import { focusedBodyCamera, type OrbitLookMode } from '../camera/orbitCamera.js';
import type { CameraState } from '../camera/cameraModes.js';
import { bodyRelativeCameraFromWorld, type OrbitCamera } from './orbitCamera.js';
import { fadeOpacity, resolveBodyParams } from '../scene/bodyParams.js';
import { resolveBodyAtmosphere, bodyAtmosphereToParameters } from '../scene/bodyAtmosphere.js';
import { DEFAULT_TESSELLATION } from '../patches/tessellationSettings.js';
import { DEFAULT_MATERIAL_OVERRIDES, type MaterialDebugMode } from '../material/biomes.js';
import type { SceneViewportPrefs } from '../scene/viewportPrefs.js';
import type { PlanetRenderInputs } from '../render/planetRenderer.js';
import type { LightingUniforms } from '../render/uniformLayouts.js';
import type { BodyNode, Quat } from '../scene/types.js';
import type { Vec3 } from '../math/vec.js';

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
	/** Body world position — required for the free-fly floating-origin camera. */
	bodyWorldPos: Vec3;
	width: number;
	height: number;
	time: number;
	/** Packed scene lighting (sun toward Sol, body frame). */
	lighting: LightingUniforms;
	/** Evaluated body-frame world rotation (spin/tilt) for terrain sampling. */
	planetRotation: Quat;
	materialDebug?: MaterialDebugMode;
	viewportPrefs?: SceneViewportPrefs;
	/** Terrain alpha (0..1) for the sphere→terrain cross-fade; the LOD blend. Default 1. */
	blend?: number;
}

export function buildProceduralRenderInput(o: ProceduralRenderOpts): PlanetRenderInputs {
	// World scale: terrain is scale-invariant, so render at radius = radiusMeters.
	const params = { ...resolveBodyParams(o.body), radius: o.body.radiusMeters };
	const aspect = o.width / Math.max(o.height, 1);
	const camera =
		o.sceneCamera.mode === 'freeFly'
			? bodyRelativeCameraFromWorld(
					o.sceneCamera.camera,
					o.bodyWorldPos,
					o.body.radiusMeters,
					aspect
				)
			: focusedBodyCamera({
					azimuth: o.sceneCamera.camera.azimuth,
					elevation: o.sceneCamera.camera.elevation,
					distance: o.sceneCamera.camera.distance,
					planetRadius: o.body.radiusMeters,
					aspect,
					lookMode: o.sceneCamera.lookMode ?? 'planet-center'
				});
	const prefs = o.viewportPrefs;
	return {
		time: o.time,
		camera,
		width: o.width,
		height: o.height,
		params,
		tessellation: prefs?.tessellation ?? DEFAULT_TESSELLATION,
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
			objectOpacity: fadeOpacity(o.blend ?? 1)
		},
		atmosphere: bodyAtmosphereToParameters(
			resolveBodyAtmosphere(o.body),
			prefs?.atmosphereIntegrateSteps
		),
		planetRotation: o.planetRotation
	};
}
