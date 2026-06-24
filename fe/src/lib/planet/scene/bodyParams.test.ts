import { describe, expect, it } from 'vitest';
import {
	DEFAULT_LOD_THRESHOLDS,
	diffAppearanceOverrides,
	fadeOpacity,
	proceduralBlend,
	resolveBodyParams,
	resolveLodTransitionBlends,
	selectLod
} from './bodyParams.js';
import { DEFAULT_PRESET, PLANET_PRESETS, type PlanetPresetName } from '../params/presets.js';
import type { BodyNode } from './types.js';

function body(extra: Partial<BodyNode> = {}): BodyNode {
	return {
		id: 'b',
		name: 'b',
		parentId: null,
		kind: 'body',
		enabled: true,
		transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
		bodyType: 'planet',
		radiusMeters: 5e5,
		standIn: false,
		...extra
	} as BodyNode;
}

const T = { sphereAboveRadiusPx: 1, proceduralAboveRadiusPx: 100, proceduralFullRadiusPx: 150 };

describe('resolveBodyParams', () => {
	it('defaults to the default preset with no appearance', () => {
		expect(resolveBodyParams(body())).toEqual(PLANET_PRESETS[DEFAULT_PRESET]);
	});

	it('merges sparse overrides over the chosen preset', () => {
		const p = resolveBodyParams(
			body({ appearance: { preset: 'desert', overrides: { water_level: 0.123 } } })
		);
		expect(p.water_level).toBe(0.123);
		expect(p.voronoi_scale).toBe(PLANET_PRESETS.desert.voronoi_scale);
	});

	it('falls back to the default preset for an unknown name', () => {
		const p = resolveBodyParams(body({ appearance: { preset: 'nope' as PlanetPresetName } }));
		expect(p).toEqual(PLANET_PRESETS[DEFAULT_PRESET]);
	});
});

describe('diffAppearanceOverrides', () => {
	it('keeps only fields that differ from the preset', () => {
		const params = { ...PLANET_PRESETS.desert, water_level: 0.123, erosion: 2.5 };
		const overrides = diffAppearanceOverrides(params, 'desert');
		expect(overrides).toEqual({ water_level: 0.123, erosion: 2.5 });
	});

	it('is empty when params equal the preset', () => {
		expect(diffAppearanceOverrides({ ...PLANET_PRESETS.desert }, 'desert')).toEqual({});
	});

	it('round-trips with resolveBodyParams', () => {
		const edited = { ...PLANET_PRESETS.desert, voronoi_distortion_scale: 7, snow_cover: 0.9 };
		const overrides = diffAppearanceOverrides(edited, 'desert');
		const resolved = resolveBodyParams(body({ appearance: { preset: 'desert', overrides } }));
		expect(resolved).toEqual(edited);
	});
});

describe('selectLod', () => {
	it('picks dot / mesh by projected radius (defaults)', () => {
		expect(selectLod(0.5, DEFAULT_LOD_THRESHOLDS)).toBe('dot');
		expect(selectLod(50, DEFAULT_LOD_THRESHOLDS)).toBe('mesh');
		expect(selectLod(500, DEFAULT_LOD_THRESHOLDS)).toBe('mesh');
	});

	it('honours the given thresholds', () => {
		const t = { sphereAboveRadiusPx: 10, proceduralAboveRadiusPx: 100, proceduralFullRadiusPx: 150 };
		expect(selectLod(5, t)).toBe('dot');
		expect(selectLod(50, t)).toBe('mesh');
		expect(selectLod(150, t)).toBe('mesh');
	});
});

describe('proceduralBlend', () => {
	it('ramps 0→1 over the explicit terrain start/full band', () => {
		expect(proceduralBlend(80, T)).toBe(0);
		expect(proceduralBlend(100, T)).toBe(0);
		expect(proceduralBlend(125, T)).toBeCloseTo(0.5, 6);
		expect(proceduralBlend(150, T)).toBe(1);
		expect(proceduralBlend(400, T)).toBe(1);
	});
});

describe('fadeOpacity', () => {
	it('preserves the endpoints and biases toward the sphere mid-transition', () => {
		expect(fadeOpacity(0)).toBe(0);
		expect(fadeOpacity(1)).toBe(1);
		expect(fadeOpacity(0.5)).toBeLessThan(0.5);
		expect(fadeOpacity(0.8)).toBeLessThan(0.8);
	});

	it('is linear at gamma 1 and biases harder as gamma grows', () => {
		expect(fadeOpacity(0.5, 1)).toBeCloseTo(0.5, 6);
		expect(fadeOpacity(0.5, 4)).toBeLessThan(fadeOpacity(0.5, 2));
	});

	it('clamps gamma to >= 1 (never biases toward the terrain)', () => {
		expect(fadeOpacity(0.5, 0)).toBeCloseTo(0.5, 6);
	});

	it('clamps out-of-range blend', () => {
		expect(fadeOpacity(-1)).toBe(0);
		expect(fadeOpacity(2)).toBe(1);
	});
});

describe('resolveLodTransitionBlends', () => {
	it('smooth-mesh band: displacement 0, toggled channels off, non-toggled on', () => {
		expect(resolveLodTransitionBlends(50, T, 'both')).toEqual({
			displacementBlend: 0,
			heightBlend: 0,
			atmosphereBlend: 0
		});
		expect(resolveLodTransitionBlends(50, T, 'heights')).toEqual({
			displacementBlend: 0,
			heightBlend: 0,
			atmosphereBlend: 1
		});
		expect(resolveLodTransitionBlends(50, T, 'atmosphere')).toEqual({
			displacementBlend: 0,
			heightBlend: 1,
			atmosphereBlend: 0
		});
	});

	it('terrain band ramps displacement always and toggled channels with gamma', () => {
		const mid = resolveLodTransitionBlends(125, T, 'both', 1);
		expect(mid.displacementBlend).toBeCloseTo(0.5, 6);
		expect(mid.heightBlend).toBeCloseTo(0.5, 6);
		expect(mid.atmosphereBlend).toBeCloseTo(0.5, 6);

		const heightsOnly = resolveLodTransitionBlends(125, T, 'heights', 1);
		expect(heightsOnly.displacementBlend).toBeCloseTo(0.5, 6);
		expect(heightsOnly.heightBlend).toBeCloseTo(0.5, 6);
		expect(heightsOnly.atmosphereBlend).toBe(1);

		const atmoOnly = resolveLodTransitionBlends(125, T, 'atmosphere', 1);
		expect(atmoOnly.displacementBlend).toBeCloseTo(0.5, 6);
		expect(atmoOnly.heightBlend).toBe(1);
		expect(atmoOnly.atmosphereBlend).toBeCloseTo(0.5, 6);
	});

	it('is full at terrain full', () => {
		expect(resolveLodTransitionBlends(200, T, 'both')).toEqual({
			displacementBlend: 1,
			heightBlend: 1,
			atmosphereBlend: 1
		});
	});
});
