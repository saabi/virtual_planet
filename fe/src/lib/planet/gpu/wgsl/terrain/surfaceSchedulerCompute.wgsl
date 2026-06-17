// GPU patch culling/expansion prototype (Wave 5 stub).
// Enable when indirect draws land in WebGPUBackend.

@compute @workgroup_size(64)
fn surface_scheduler_compute_stub(@builtin(global_invocation_id) gid: vec3u) {
  _ = gid.x;
}
