/**
 * Serializable atmosphere parameters.
 *
 * SCALE CONTRACT (see _docs/renderer-unification-plan.md §3.1). Optical depth ≈
 * ∫ strength·density·dl, and both the shell path `dl` and the scale height grow with
 * radius, so raw optical depth ∝ strength × radius. `toGpuAtmosphereParams` divides the
 * per-unit-length strengths by `radius / R_ref`, so one authored strength looks the same
 * at any radius (at R_ref the factor is 1, so `/planet` is unchanged; the shader's β
 * applies no radius factor of its own). Tags mirror PlanetParameters; `norm` = a
 * per-unit-length strength made radius-invariant by that normalization.
 */
export interface AtmosphereParameters {
	/** flag — when false, skip scattering/fog and present terrain without an atmosphere pass. */
	enabled: boolean;
	/** length — shell thickness above the surface (default radius·0.2; floored at radius·0.05). */
	shellHeightMeters: number;
	/** length — density e-folding height (default radius·0.1; floored at radius·0.02). */
	scaleHeightMeters: number;
	/** norm — Rayleigh scattering strength (radius-invariant via R_ref/radius). */
	rayleighStrength: number;
	/** norm — Mie scattering strength (radius-invariant via R_ref/radius). */
	mieStrength: number;
	/** pure — Mie phase anisotropy g ∈ (−1, 1). */
	mieG: number;
	/** pure — ground fog density (dimensionless multiplier on ρ; rides on σ_t, so it
	 *  inherits the strength normalization — no radius factor of its own). */
	groundFogDensity: number;
	/** pure — sun-disk radiance multiplier. */
	sunDiskIntensity: number;
	/** quality — ray-march sample count (view/quality pref, slated for RenderQualitySettings). */
	integrateSteps: number;
}

export interface GpuAtmosphereParams {
	planet_center: [number, number, number];
	planet_radius: number;
	outer_radius: number;
	scale_height: number;
	mie_g: number;
	ground_fog_density: number;
	rayleigh_strength: number;
	mie_strength: number;
	sun_radiance: number;
	fog_height: number;
	integrate_steps: number;
	_pad0: number;
}

export const ATMOSPHERE_UNIFORM_SIZE = 64;

/** Authoring reference radius (m) for atmosphere strength normalization — see the scale
 *  contract above and renderer-unification-plan §3.1. Strengths are authored at this
 *  radius (the presets' scale); the GPU value divides by `radius / R_ref` so optical
 *  depth (∝ strength × radius) stays constant as the body grows. */
export const ATMOSPHERE_R_REF = 100;

export function defaultAtmosphereParams(
	radius: number,
	groundFogDensity = 0.8
): AtmosphereParameters {
	return {
		enabled: true,
		shellHeightMeters: radius * 0.2,
		scaleHeightMeters: radius * 0.1,
		rayleighStrength: 1.0,
		mieStrength: 1.0,
		mieG: 0.76,
		groundFogDensity,
		sunDiskIntensity: 20.0,
		integrateSteps: 12
	};
}

export function toGpuAtmosphereParams(
	params: AtmosphereParameters,
	planetRadius: number,
	planetCenter: [number, number, number] = [0, 0, 0],
	integrateSteps = params.integrateSteps
): GpuAtmosphereParams {
	const shell = Math.max(params.shellHeightMeters, planetRadius * 0.05);
	const scaleH = Math.max(params.scaleHeightMeters, planetRadius * 0.02);
	const active = params.enabled;
	// Scale-invariance (renderer-unification-plan §3.1): optical depth ≈ strength × radius
	// (β·∫ρ dl, and the shell path + scale height both grow with radius), so divide the
	// authored per-unit-length strengths by radius / R_ref to keep one strength looking
	// the same at any radius. At R_ref the factor is 1 (/planet unchanged); the shader's
	// β no longer applies its own radius factor. Fog density rides on σ_t, so it inherits
	// this normalization and needs none of its own.
	const strengthNorm = ATMOSPHERE_R_REF / Math.max(planetRadius, 1);
	return {
		planet_center: planetCenter,
		planet_radius: planetRadius,
		outer_radius: planetRadius + shell,
		scale_height: scaleH,
		mie_g: params.mieG,
		ground_fog_density: active ? params.groundFogDensity : 0,
		rayleigh_strength: active ? params.rayleighStrength * strengthNorm : 0,
		mie_strength: active ? params.mieStrength * strengthNorm : 0,
		sun_radiance: active ? params.sunDiskIntensity : 0,
		fog_height: scaleH * 2.0,
		integrate_steps: active ? integrateSteps : 0,
		_pad0: 0
	};
}

export function writeAtmosphereParamsToBuffer(
	buffer: ArrayBuffer,
	offset: number,
	params: GpuAtmosphereParams
): void {
	const view = new DataView(buffer, offset, ATMOSPHERE_UNIFORM_SIZE);
	view.setFloat32(0, params.planet_center[0], true);
	view.setFloat32(4, params.planet_center[1], true);
	view.setFloat32(8, params.planet_center[2], true);
	view.setFloat32(12, params.planet_radius, true);
	view.setFloat32(16, params.outer_radius, true);
	view.setFloat32(20, params.scale_height, true);
	view.setFloat32(24, params.mie_g, true);
	view.setFloat32(28, params.ground_fog_density, true);
	view.setFloat32(32, params.rayleigh_strength, true);
	view.setFloat32(36, params.mie_strength, true);
	view.setFloat32(40, params.sun_radiance, true);
	view.setFloat32(44, params.fog_height, true);
	view.setFloat32(48, params.integrate_steps, true);
	view.setFloat32(52, params._pad0, true);
}
