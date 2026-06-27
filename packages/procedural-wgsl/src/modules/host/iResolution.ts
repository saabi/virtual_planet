/** Placeholder WGSL for `host.iResolution` — the runtime injects target resolution. */
export const HOST_IRESOLUTION_SOURCE = `fn i_resolution() -> vec2f {
	return vec2f(1.0);
}`;

export const HOST_IRESOLUTION_MODULE = {
	id: 'host.iResolution',
	source: HOST_IRESOLUTION_SOURCE
} as const;
