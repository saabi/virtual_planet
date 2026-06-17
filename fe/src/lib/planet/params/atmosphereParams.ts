/** Serializable atmosphere parameters. */
export interface AtmosphereParameters {
	/** When false, skip scattering/fog and present terrain without an atmosphere pass. */
	enabled: boolean;
	shellHeightMeters: number;
	scaleHeightMeters: number;
	rayleighStrength: number;
	mieStrength: number;
	mieG: number;
	groundFogDensity: number;
	sunDiskIntensity: number;
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
	return {
		planet_center: planetCenter,
		planet_radius: planetRadius,
		outer_radius: planetRadius + shell,
		scale_height: scaleH,
		mie_g: params.mieG,
		ground_fog_density: active ? params.groundFogDensity : 0,
		rayleigh_strength: active ? params.rayleighStrength : 0,
		mie_strength: active ? params.mieStrength : 0,
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
