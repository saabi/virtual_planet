/** WGSL module `procedural.metricPosition` — consumer-injected metric position stub. */
export const PROCEDURAL_METRIC_POSITION_SOURCE = `// metricPosition is a consumer-injected stub.
// Consumers (e.g., vegetation compute) override this function body
// with their own world-space position calculation.
fn metricPosition() -> vec3<f32> {
	return vec3<f32>(0.0, 0.0, 0.0);
}`;

export const PROCEDURAL_METRIC_POSITION_MODULE = {
	id: 'procedural.metricPosition',
	source: PROCEDURAL_METRIC_POSITION_SOURCE
} as const;
