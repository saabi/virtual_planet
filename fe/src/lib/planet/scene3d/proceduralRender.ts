import { focusedBodyCamera, type OrbitLookMode } from '../camera/orbitCamera.js';
import type { OrbitCamera } from './orbitCamera.js';
import { resolveBodyParams } from '../scene/bodyParams.js';
import { resolveBodyAtmosphere, bodyAtmosphereToParameters } from '../scene/bodyAtmosphere.js';
import { DEFAULT_TESSELLATION } from '../patches/tessellationSettings.js';
import { DEFAULT_MATERIAL_OVERRIDES, type MaterialDebugMode } from '../material/biomes.js';
import type { PlanetRenderInputs } from '../render/planetRenderer.js';
import type { LightingUniforms } from '../render/uniformLayouts.js';
import type { BodyNode, Quat } from '../scene/types.js';

// Build the per-frame input for rendering a scene body procedurally — the world-scale
// params, the shared focused-body camera, body atmosphere, and scene lighting. Extracted
// from ProceduralBodyLayer so the scene engine can render the body into its own offscreen
// layer (Phase 5) using the same inputs.

export interface ProceduralRenderOpts {
	body: BodyNode;
	/** Scene orbit camera (azimuth/elevation/distance); the body is the target. */
	camera: OrbitCamera;
	width: number;
	height: number;
	time: number;
	/** Packed scene lighting (sun toward Sol, body frame). */
	lighting: LightingUniforms;
	/** Evaluated body-frame world rotation (spin/tilt) for terrain sampling. */
	planetRotation: Quat;
	materialDebug?: MaterialDebugMode;
	lookMode?: OrbitLookMode;
}

export function buildProceduralRenderInput(o: ProceduralRenderOpts): PlanetRenderInputs {
	// World scale: terrain is scale-invariant, so render at radius = radiusMeters.
	const params = { ...resolveBodyParams(o.body), radius: o.body.radiusMeters };
	const camera = focusedBodyCamera({
		azimuth: o.camera.azimuth,
		elevation: o.camera.elevation,
		distance: o.camera.distance,
		planetRadius: o.body.radiusMeters,
		aspect: o.width / Math.max(o.height, 1),
		lookMode: o.lookMode ?? 'planet-center'
	});
	return {
		time: o.time,
		camera,
		width: o.width,
		height: o.height,
		params,
		tessellation: DEFAULT_TESSELLATION,
		debug: { wireframe: false, faceColors: false, showPatchBorders: false, showRingColors: false },
		lighting: o.lighting,
		materialOverrides: { ...DEFAULT_MATERIAL_OVERRIDES, materialDebug: o.materialDebug ?? 'off' },
		atmosphere: bodyAtmosphereToParameters(resolveBodyAtmosphere(o.body)),
		planetRotation: o.planetRotation
	};
}
