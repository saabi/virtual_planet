import { describe, expect, it } from 'vitest';
import {
	DEFAULT_LOD_THRESHOLDS,
	diffAppearanceOverrides,
	fadeOpacity,
	proceduralBlend,
	resolveBodyParams,
	selectLod,
	sphereFadeScale
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

describe('resolveBodyParams', () => {
	it('defaults to the default preset with no appearance', () => {
		expect(resolveBodyParams(body())).toEqual(PLANET_PRESETS[DEFAULT_PRESET]);
	});

	it('merges sparse overrides over the chosen preset', () => {
		const p = resolveBodyParams(
			body({ appearance: { preset: 'desert', overrides: { water_level: 0.123 } } })
		);
		expect(p.water_level).toBe(0.123); // overridden
		expect(p.voronoi_scale).toBe(PLANET_PRESETS.desert.voronoi_scale); // from the preset
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
	it('picks dot / sphere / procedural by projected radius (defaults)', () => {
		expect(selectLod(0.5, DEFAULT_LOD_THRESHOLDS)).toBe('dot');
		expect(selectLod(50, DEFAULT_LOD_THRESHOLDS)).toBe('sphere');
		expect(selectLod(500, DEFAULT_LOD_THRESHOLDS)).toBe('procedural');
	});

	it('honours the given thresholds', () => {
		const t = { sphereAboveRadiusPx: 10, proceduralAboveRadiusPx: 100, proceduralFullRadiusPx: 150 };
		expect(selectLod(5, t)).toBe('dot');
		expect(selectLod(50, t)).toBe('sphere');
		expect(selectLod(150, t)).toBe('procedural');
	});
});

describe('proceduralBlend', () => {
	it('ramps 0→1 over the explicit terrain start/full band', () => {
		const t = { sphereAboveRadiusPx: 1, proceduralAboveRadiusPx: 100, proceduralFullRadiusPx: 150 };
		expect(proceduralBlend(80, t)).toBe(0); // below threshold: sphere only
		expect(proceduralBlend(100, t)).toBe(0); // at threshold: just starting
		expect(proceduralBlend(125, t)).toBeCloseTo(0.5, 6); // mid-fade
		expect(proceduralBlend(150, t)).toBe(1); // fully procedural
		expect(proceduralBlend(400, t)).toBe(1); // clamped
	});
});

describe('fadeOpacity', () => {
	it('preserves the endpoints and biases toward the sphere mid-transition', () => {
		expect(fadeOpacity(0)).toBe(0);
		expect(fadeOpacity(1)).toBe(1);
		// default gamma > 1 ⇒ opacity sits below the linear blend everywhere in between
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

describe('sphereFadeScale', () => {
	it('is full radius before the fade and recedes by shrinkPercent at full fade', () => {
		expect(sphereFadeScale(0, 6)).toBe(1);
		expect(sphereFadeScale(1, 6)).toBeCloseTo(0.94, 6);
		expect(sphereFadeScale(0.5, 6)).toBeCloseTo(0.97, 6);
	});

	it('never shrinks at 0 percent', () => {
		expect(sphereFadeScale(0.5, 0)).toBe(1);
		expect(sphereFadeScale(1, 0)).toBe(1);
	});

	it('clamps out-of-range blend and negative shrink', () => {
		expect(sphereFadeScale(2, 10)).toBeCloseTo(0.9, 6);
		expect(sphereFadeScale(-1, 10)).toBe(1);
		expect(sphereFadeScale(1, -5)).toBe(1);
	});
});
