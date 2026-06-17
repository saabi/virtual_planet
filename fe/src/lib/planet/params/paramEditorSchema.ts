import type { PlanetParameters } from './planetParams.js';

export interface ParamSliderDef {
	key: keyof PlanetParameters;
	label: string;
	min: number;
	max: number;
	step: number;
}

export interface ParamEditorSection {
	title: string;
	sliders: ParamSliderDef[];
}

/** Slider groups and ranges mirrored from the legacy PlanetDisplay editor. */
export const PARAM_EDITOR_SECTIONS: ParamEditorSection[] = [
	{
		title: 'Planet',
		sliders: [{ key: 'radius', label: 'Radius', min: 0, max: 3000, step: 1 }]
	},
	{
		title: 'Tectonics',
		sliders: [
			{ key: 'voronoi_scale', label: 'Scale', min: 0, max: 10, step: 0.1 },
			{ key: 'voronoi_amplitude', label: 'Amplitude', min: 0, max: 50, step: 0.1 },
			{ key: 'voronoi_albedo', label: 'Albedo', min: 0, max: 1, step: 0.01 },
			{ key: 'voronoi_albedo_y', label: 'Albedo Y', min: 0, max: 1, step: 0.01 },
			{ key: 'voronoi_albedo_z', label: 'Albedo Z', min: 0, max: 1, step: 0.01 }
		]
	},
	{
		title: 'Plate Distortion',
		sliders: [
			{ key: 'voronoi_distortion_scale', label: 'Scale', min: 0, max: 10, step: 0.1 },
			{ key: 'voronoi_distortion_amplitude', label: 'Amplitude', min: 0, max: 50, step: 0.1 },
			{ key: 'voronoi_distortion_albedo', label: 'Albedo', min: 0, max: 1, step: 0.01 }
		]
	},
	{
		title: 'Terrain Detail',
		sliders: [
			{ key: 'detail_scale', label: 'Scale', min: 0, max: 100, step: 0.1 },
			{ key: 'detail_amplitude', label: 'Amplitude', min: 0, max: 50, step: 0.1 },
			{ key: 'detail_albedo', label: 'Albedo', min: 0, max: 1, step: 0.01 }
		]
	},
	{
		title: 'Water',
		sliders: [{ key: 'water_level', label: 'Level', min: 0, max: 1, step: 0.01 }]
	},
	{
		title: 'Erosion',
		sliders: [
			{ key: 'erosion', label: 'Erosion Level', min: 0, max: 3, step: 0.01 },
			{ key: 'sand_cutoff', label: 'Sand', min: 0, max: 1, step: 0.01 },
			{ key: 'vegetation_level', label: 'Vegetation', min: 0, max: 1, step: 0.01 },
			{ key: 'snow_cover', label: 'Snow', min: 0, max: 1, step: 0.01 }
		]
	},
	{
		title: 'Texture Noise',
		sliders: [
			{ key: 'texture_noise_scale', label: 'Scale', min: 0, max: 10, step: 0.01 },
			{ key: 'texture_noise_amplitude', label: 'Amplitude', min: 0, max: 10, step: 0.01 }
		]
	},
	{
		title: 'Polarity',
		sliders: [
			{ key: 'polar_scale', label: 'Level', min: 0, max: 1, step: 0.01 },
			{ key: 'polar_amplitude', label: 'Amplitude', min: 0, max: 20, step: 0.1 }
		]
	}
];
