/** Placeholder WGSL for `host.fragCoord` — the runtime injects fragment coordinates. */
export const HOST_FRAG_COORD_SOURCE = `fn frag_coord() -> vec2f {
	return vec2f(0.0);
}`;

export const HOST_FRAG_COORD_MODULE = {
	id: 'host.fragCoord',
	source: HOST_FRAG_COORD_SOURCE
} as const;
