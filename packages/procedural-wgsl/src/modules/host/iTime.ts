/** Placeholder WGSL for `host.iTime` — the runtime injects elapsed time. */
export const HOST_ITIME_SOURCE = `fn i_time() -> f32 {
	return 0.0;
}`;

export const HOST_ITIME_MODULE = {
	id: 'host.iTime',
	source: HOST_ITIME_SOURCE
} as const;
