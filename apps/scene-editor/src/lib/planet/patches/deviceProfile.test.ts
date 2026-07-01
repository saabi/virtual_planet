import { describe, expect, it } from 'vitest';
import { classifyMobile, initialTessellationSettings, type UaSignals } from './deviceProfile.js';
import { DEFAULT_TESSELLATION } from './tessellationSettings.js';

// UA strings for the cases that matter. Note the iPad and the real Mac share an
// identical UA (iPadOS Safari masquerades as desktop Mac) — only maxTouchPoints
// distinguishes them, which is exactly what the iPad catch keys on.
const UA = {
	windowsChrome:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	androidChrome:
		'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
	iphone:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
	mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
};

function signals(p: Partial<UaSignals>): UaSignals {
	return { uaDataMobile: undefined, userAgent: UA.windowsChrome, maxTouchPoints: 0, ...p };
}

describe('classifyMobile', () => {
	it('trusts UA Client Hints when present (mobile:true wins over a desktop UA)', () => {
		expect(classifyMobile(signals({ uaDataMobile: true, userAgent: UA.windowsChrome }))).toBe(true);
	});

	it('trusts UA Client Hints when present (mobile:false wins over a mobile UA)', () => {
		expect(classifyMobile(signals({ uaDataMobile: false, userAgent: UA.androidChrome }))).toBe(
			false
		);
	});

	it('falls back to the userAgent regex without UA Client Hints', () => {
		expect(classifyMobile(signals({ userAgent: UA.androidChrome }))).toBe(true);
		expect(classifyMobile(signals({ userAgent: UA.iphone }))).toBe(true);
		expect(classifyMobile(signals({ userAgent: UA.windowsChrome }))).toBe(false);
	});

	it('catches iPadOS Safari masquerading as a Mac (multi-touch)', () => {
		expect(classifyMobile(signals({ userAgent: UA.mac, maxTouchPoints: 5 }))).toBe(true);
	});

	it('does not flag a real Mac (no touchscreen)', () => {
		expect(classifyMobile(signals({ userAgent: UA.mac, maxTouchPoints: 0 }))).toBe(false);
	});

	it('does not flag a touch-enabled Windows laptop (not a Mac UA)', () => {
		expect(classifyMobile(signals({ userAgent: UA.windowsChrome, maxTouchPoints: 10 }))).toBe(
			false
		);
	});
});

describe('initialTessellationSettings', () => {
	it('returns the desktop default under SSR / non-DOM test env', () => {
		// window/navigator absent (or non-mobile jsdom) → desktop default.
		expect(initialTessellationSettings()).toEqual(DEFAULT_TESSELLATION);
	});
});
