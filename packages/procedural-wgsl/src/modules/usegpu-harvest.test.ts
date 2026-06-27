import { describe, expect, it } from 'vitest';

import { createStandardLibraryResolver } from '../resolver.js';
import {
	COLOR_HSV_TO_RGB_MODULE,
	COLOR_LINEAR_TO_SRGB_MODULE,
	COLOR_SRGB_TO_LINEAR_MODULE
} from './color/index.js';
import { NOISE_IGN_MODULE } from './noise/ign.js';
import {
	SDF_BOX_MODULE,
	SDF_CIRCLE_MODULE,
	SDF_OP_INTERSECT_MODULE,
	SDF_OP_SUBTRACT_MODULE,
	SDF_OP_UNION_MODULE,
	SDF_SEGMENT_MODULE
} from './sdf/index.js';

describe('Use.GPU harvest WGSL modules', () => {
	it('includes MIT+NMLA attribution on ported Use.GPU modules', () => {
		expect(COLOR_SRGB_TO_LINEAR_MODULE.source).toContain('MIT+NMLA');
		expect(COLOR_SRGB_TO_LINEAR_MODULE.source).toContain('source: use.gpu');
		expect(NOISE_IGN_MODULE.source).toContain('sourceSymbol: IGN');
	});

	it('registers harvested modules with expected entry functions', async () => {
		const resolver = createStandardLibraryResolver();
		const entries: Record<string, string> = {
			'color.srgbToLinear': 'srgbToLinear',
			'color.linearToSrgb': 'linearToSrgb',
			'color.hsv2rgb': 'hsv2rgb',
			'sdf.circle': 'sdfCircle',
			'sdf.box': 'sdfBox',
			'sdf.segment': 'sdfSegment',
			'sdf.opUnion': 'opUnion',
			'sdf.opSubtract': 'opSubtract',
			'sdf.opIntersect': 'opIntersect'
		};

		for (const [moduleId, entry] of Object.entries(entries)) {
			const mod = await resolver.resolve(moduleId);
			expect(mod.source).toContain(`fn ${entry}(`);
		}
	});

	it('marks reauthored SDF modules and includes category/group frontmatter', () => {
		expect(SDF_CIRCLE_MODULE.source).toContain('source: reauthored');
		expect(SDF_CIRCLE_MODULE.source).toContain('group: Geometry');
		expect(SDF_BOX_MODULE.source).toContain('category: SDF');
		expect(SDF_OP_UNION_MODULE.source).toContain('fn opUnion(');
		expect(SDF_OP_SUBTRACT_MODULE.source).toContain('fn opSubtract(');
		expect(SDF_OP_INTERSECT_MODULE.source).toContain('fn opIntersect(');
		expect(SDF_SEGMENT_MODULE.source).toContain('fn sdfSegment(');
	});

	it('ports gamma decode/encode semantics from Use.GPU', () => {
		expect(COLOR_SRGB_TO_LINEAR_MODULE.source).toContain('pow(srgb, vec3<f32>(SRGB_GAMMA))');
		expect(COLOR_LINEAR_TO_SRGB_MODULE.source).toContain('1.0 / SRGB_GAMMA');
		expect(COLOR_HSV_TO_RGB_MODULE.source).toContain('source: reauthored');
	});

	it('keeps noise.ign module source available before graph registration', () => {
		expect(NOISE_IGN_MODULE.source).toContain('fn ign(');
		expect(NOISE_IGN_MODULE.source).toContain('0.06711056');
	});
});
