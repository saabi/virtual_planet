#include "types.wgsl"
#include "params.wgsl"
#include "../noise/fbm.wgsl"
#include "../noise/voronoi.wgsl"

fn should_eval_layer(min_mpp: f32, scale: ScaleContext) -> bool {
  return scale.meters_per_pixel <= min_mpp;
}

/// Rotate a vector about the +Y axis by the angle whose cosine/sine are (c, s).
fn rotate_y(v: vec3f, c: f32, s: f32) -> vec3f {
  return vec3f(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
}

/// Rotate a vector v by quaternion q = [x, y, z, w]
fn rotate_vector_by_quat(q: vec4f, v: vec3f) -> vec3f {
  let temp = cross(q.xyz, v) + q.w * v;
  return v + 2.0 * cross(q.xyz, temp);
}

/// Rotate a vector v by the conjugate/inverse of quaternion q
fn rotate_vector_by_quat_inv(q: vec4f, v: vec3f) -> vec3f {
  let temp = cross(-q.xyz, v) + q.w * v;
  return v + 2.0 * cross(-q.xyz, temp);
}

fn sample_planet(unit_dir: vec3f, params: PlanetParams, scale: ScaleContext) -> PlanetSample {
  var p = unit_dir;
  var r: PlanetSample;
  r.unit_dir = unit_dir;

  // Relief amplitudes are ratios of radius (scale-independent); convert to metres.
  let v_amp = params.voronoi_amplitude * params.radius;
  let d_amp = params.detail_amplitude * params.radius;
  let total_amplitude = v_amp + d_amp;
  let wl = total_amplitude * (params.water_level - 0.5);

  var distortion = 0.0;
  if (should_eval_layer(500.0, scale) && params.voronoi_distortion_scale > 0.0) {
    distortion = fbm_4(p * params.voronoi_distortion_scale);
  }
  r.distortion = distortion;

  var vor = vec3f(0.5);
  if (should_eval_layer(1000.0, scale)) {
    vor = voronoi3(p * params.voronoi_scale + (distortion - 0.5) * params.voronoi_distortion_amplitude);
  }
  r.vor = vor;

  var detail = 0.5;
  if (should_eval_layer(50.0, scale) && params.detail_scale > 0.0) {
    detail = fbm_4(p * params.detail_scale);
  }
  r.detail = detail;

  var height = (vor.x - 0.5) * v_amp + (detail - 0.5) * d_amp;
  var th = height - wl;
  var thf: f32;
  if (th > 0.0) {
    thf = total_amplitude - wl;
  } else {
    thf = wl - params.radius;
  }
  th /= thf;
  th = pow(th, params.erosion);
  r.erosion_value = th;
  th *= thf;
  height = wl + th;
  r.height_meters = height;
  r.water_height_meters = wl;

  var radius = params.radius + height;
  if (params.render_water > 0.5) {
    radius = params.radius + max(height, wl);
  }
  r.world_radius_meters = radius;
  r.world_pos = p * radius;
  return r;
}
