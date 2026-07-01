import {
	DEFAULT_TESSELLATION,
	MOBILE_TESSELLATION,
	type TessellationSettings
} from './tessellationSettings.js';

// Best-effort device classification to pick a safe initial tessellation. We can't
// measure GPU throughput before launching the renderer, but we can tell a phone
// from a desktop well enough to keep mobiles off the desktop-grade default (which
// can crash the first frame on a weak GPU). See
// _docs/specs/device-tessellation-defaults.md.

/** Navigator fields used for mobile classification, factored out so it's testable. */
export interface UaSignals {
	/** UA Client Hints `mobile` flag — authoritative where present (Chromium/Android). */
	uaDataMobile: boolean | undefined;
	userAgent: string;
	maxTouchPoints: number;
}

const MOBILE_UA =
	/Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile|Mobile/i;

/**
 * Pure mobile classifier. UA Client Hints first (authoritative), else a userAgent
 * regex, plus an iPad catch: iPadOS Safari reports a desktop Mac UA, so a "Mac"
 * with multi-touch is an iPad. That catch cannot false-positive a touch
 * desktop/laptop — Windows/ChromeOS touch devices don't report `Macintosh`, and
 * real Macs have no touchscreen (`maxTouchPoints === 0`; the Touch Bar doesn't
 * count). `> 1` requires genuine multi-touch as an extra guard. Biased toward
 * "mobile" when ambiguous (a capable device starting coarse just looks blocky
 * briefly; a weak one starting high can brick).
 */
export function classifyMobile(s: UaSignals): boolean {
	if (typeof s.uaDataMobile === 'boolean') return s.uaDataMobile;
	if (MOBILE_UA.test(s.userAgent)) return true;
	return /Macintosh/.test(s.userAgent) && s.maxTouchPoints > 1;
}

/** Read the live navigator (client-only); desktop under SSR/tests without a DOM. */
export function isMobileDevice(): boolean {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
	const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } })
		.userAgentData;
	return classifyMobile({
		uaDataMobile: typeof uaData?.mobile === 'boolean' ? uaData.mobile : undefined,
		userAgent: navigator.userAgent,
		maxTouchPoints: navigator.maxTouchPoints
	});
}

/**
 * Initial per-device tessellation. Mobile starts at the lowest settings to
 * guarantee the first frame loads; desktop keeps the full default. No persisted
 * device preference yet — it re-applies each load, so it is inherently safe (a
 * too-high value can never get stuck). Persisting it safely needs the boot
 * sentinel; see the spec's persistence section.
 */
export function initialTessellationSettings(): TessellationSettings {
	return isMobileDevice() ? { ...MOBILE_TESSELLATION } : { ...DEFAULT_TESSELLATION };
}
