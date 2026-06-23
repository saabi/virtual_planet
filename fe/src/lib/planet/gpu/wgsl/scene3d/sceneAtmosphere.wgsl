#include "../atmosphere/atmosphereParams.wgsl"
#include "../atmosphere/integrate.wgsl"
#include "../planet/lighting.wgsl"
#include "../planet/material.wgsl"

// Scene atmosphere composite (Phase 5). Like atmosphereFullscreen.wgsl, but it runs as a
// second pass over the shared scene color+depth: it reads ONLY the scene depth (moons +
// terrain) to limit the ray-march, and alpha-blends its result over the scene instead of
// reading the color back. Run in the focused body's body-local frame (planet_center =
// origin), the same frame the terrain was rendered in, so the shared depth reconstructs
// correctly and coordinates stay small. Blend (src=one, dst=1-src.a):
//   result = inscatter + sceneColor * avgTransmittance  (== sceneColor*T + inscatter).

struct AtmosphereFrame {
  inv_view_projection: mat4x4f,
  camera_pos: vec4f,
  viewport_size: vec4f,
}

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@group(0) @binding(0) var<uniform> atmo_frame: AtmosphereFrame;
@group(0) @binding(1) var<uniform> lighting: LightingUniforms;
@group(0) @binding(2) var<uniform> mat_overrides: MaterialOverrides;
@group(0) @binding(3) var<uniform> atmo: AtmosphereParams;
@group(1) @binding(0) var scene_depth: texture_depth_2d;

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0),
  );
  let p = positions[vid];
  var out: VSOut;
  out.position = vec4f(p, 0.0, 1.0);
  out.uv = p * 0.5 + 0.5;
  out.uv.y = 1.0 - out.uv.y;
  return out;
}

fn world_ray(uv: vec2f) -> vec3f {
  let ndc_x = uv.x * 2.0 - 1.0;
  let ndc_y = (1.0 - uv.y) * 2.0 - 1.0;
  let near_h = atmo_frame.inv_view_projection * vec4f(ndc_x, ndc_y, 0.0, 1.0);
  let far_h = atmo_frame.inv_view_projection * vec4f(ndc_x, ndc_y, 1.0, 1.0);
  let near_pt = near_h.xyz / near_h.w;
  let far_pt = far_h.xyz / far_h.w;
  return normalize(far_pt - near_pt);
}

fn tone_map_reinhard_atmo(color: vec3f) -> vec3f {
  return vec3f(1.0) - exp(-color * max(mat_overrides.exposure, 0.01));
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4f {
  let eye = atmo_frame.camera_pos.xyz;
  let omega = world_ray(in.uv);

  // Cheap reject: pixels whose ray never crosses the atmosphere shell contribute nothing.
  let shell = ray_sphere_intersect(eye, omega, atmo.planet_center, atmo.outer_radius);
  if (shell.y < 0.0) {
    return vec4f(0.0);
  }

  // Nearest scene surface from the shared depth (moons + terrain). Cleared sky has depth 1,
  // which reconstructs to the far plane → a huge distance → the march is shell-limited. A
  // body nearer than the shell makes t_max fall before the shell entry → no atmosphere
  // (the body occludes the halo).
  let sun_dir = primary_sun_dir(lighting);
  let dims = vec2f(textureDimensions(scene_depth));
  let texel = vec2i(in.uv * dims);
  let depth = textureLoad(scene_depth, texel, 0);
  let ndc_x = in.uv.x * 2.0 - 1.0;
  let ndc_y = (1.0 - in.uv.y) * 2.0 - 1.0;
  let world_h = atmo_frame.inv_view_projection * vec4f(ndc_x, ndc_y, depth, 1.0);
  let surface_t = length(world_h.xyz / world_h.w - eye);

  let scatter = integrate_atmosphere(eye, omega, surface_t, sun_dir, atmo);
  let inscatter = tone_map_reinhard_atmo(scatter.rgb);
  let opacity = clamp(1.0 - scatter.a, 0.0, 1.0);
  return vec4f(inscatter, opacity);
}
