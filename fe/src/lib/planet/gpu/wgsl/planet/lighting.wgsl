#include "material.wgsl"
#include "brdf.wgsl"
#include "../atmosphere/atmosphereParams.wgsl"
#include "../atmosphere/skyRadiance.wgsl"

const MAX_LIGHTS: u32 = 4u;

struct GpuLight {
  position_or_dir: vec4f,
  color: vec4f,
  params: vec4f,
}

struct LightingUniforms {
  ambient: vec4f,
  light_count: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
  lights: array<GpuLight, MAX_LIGHTS>,
}

struct LightingResult {
  color: vec3f,
  direct_spec: vec3f,
  ibl_spec: vec3f,
}

fn attenuate_point(light_pos: vec3f, surface_pos: vec3f, range: f32) -> f32 {
  let dist = length(light_pos - surface_pos);
  let range_clamped = max(range, 1.0);
  let atten = 1.0 / (dist * dist + 1.0);
  let range_factor = clamp(1.0 - pow(dist / range_clamped, 4.0), 0.0, 1.0);
  return atten * range_factor * range_factor;
}

fn primary_sun_dir(lighting: LightingUniforms) -> vec3f {
  if (lighting.light_count > 0u && lighting.lights[0].position_or_dir.w < 0.5) {
    return normalize(lighting.lights[0].position_or_dir.xyz);
  }
  return vec3f(1.0, 0.0, 0.0);
}

/// 0 on the night hemisphere, 1 on the day hemisphere.
fn sun_hemisphere(nrm: vec3f, sun_dir: vec3f) -> f32 {
  return clamp(max(dot(nrm, sun_dir), 0.0), 0.0, 1.0);
}

/// Cosine-weighted hemisphere irradiance from analytic sky (no preconvolved map).
fn sky_diffuse_irradiance(
  nrm: vec3f,
  eye: vec3f,
  atmo: AtmosphereParams,
  sun_dir: vec3f,
) -> vec3f {
  let up = max(dot(nrm, vec3f(0.0, 1.0, 0.0)), 0.0);
  let sky_n = sky_radiance(nrm, eye, atmo, sun_dir);
  let sky_up = sky_radiance(vec3f(0.0, 1.0, 0.0), eye, atmo, sun_dir);
  return mix(sky_n * 0.35, sky_up * 0.55, up);
}

/// Single-sample prefilter stand-in (sharp → blurred by roughness).
fn sky_specular_radiance(
  refl: vec3f,
  roughness: f32,
  eye: vec3f,
  atmo: AtmosphereParams,
  sun_dir: vec3f,
) -> vec3f {
  let sharp = sky_radiance(refl, eye, atmo, sun_dir);
  let blur_dir = normalize(mix(refl, vec3f(0.0, 1.0, 0.0), clamp(roughness * 0.75, 0.0, 1.0)));
  let blurred = sky_radiance(blur_dir, eye, atmo, sun_dir);
  return mix(sharp, blurred, clamp(roughness * 1.1, 0.0, 1.0));
}

struct IblContribution {
  diffuse: vec3f,
  specular: vec3f,
}

fn evaluate_ibl(
  material: SurfaceMaterial,
  nrm: vec3f,
  view_dir: vec3f,
  sun_lit: f32,
  ambient_rgb: vec3f,
  eye: vec3f,
  atmo: AtmosphereParams,
  sun_dir: vec3f,
) -> IblContribution {
  let n_dot_v = max(dot(nrm, view_dir), 0.0);
  let f0 = material_f0(material);
  let F = fresnel_schlick_roughness(n_dot_v, f0, material.roughness);
  let kD = (vec3f(1.0) - F) * (1.0 - material.metallic);

  let day_irr = sky_diffuse_irradiance(nrm, eye, atmo, sun_dir);
  let night_irr = ambient_rgb * 0.2;
  let irradiance = mix(night_irr, day_irr, pow(sun_lit, 0.65)) + ambient_rgb * 0.35;
  let diffuse_ibl = kD * material.albedo * irradiance;

  let refl = reflect(-view_dir, nrm);
  let night_env = vec3f(0.002, 0.003, 0.01);
  let day_env = sky_specular_radiance(refl, material.roughness, eye, atmo, sun_dir);
  let env_color = mix(night_env, day_env, pow(sun_lit, 0.5));
  let brdf = env_brdf_approx(n_dot_v, material.roughness);
  let specular_ibl = env_color * (f0 * brdf.x + brdf.y);

  return IblContribution(diffuse_ibl, specular_ibl);
}

fn tone_map_reinhard(color: vec3f, exposure: f32) -> vec3f {
  return vec3f(1.0) - exp(-color * max(exposure, 0.01));
}

fn evaluate_pbr(
  material: SurfaceMaterial,
  n: vec3f,
  v: vec3f,
  surface_pos: vec3f,
  lighting: LightingUniforms,
  overrides: MaterialOverrides,
  atmo: AtmosphereParams,
  camera_pos: vec3f,
  sun_shadow: f32,
) -> LightingResult {
  let nrm = normalize(n);
  let view_dir = normalize(v);
  let f0 = material_f0(material);
  let has_direct_lights = lighting.light_count > 0u;
  let sun_dir = primary_sun_dir(lighting);
  let sun_lit = select(0.0, sun_hemisphere(nrm, sun_dir), has_direct_lights);

  var lo = vec3f(0.0);
  var direct_spec_acc = vec3f(0.0);
  var ibl_spec_acc = vec3f(0.0);

  if (has_direct_lights) {
    let ibl = evaluate_ibl(
      material,
      nrm,
      view_dir,
      sun_lit,
      lighting.ambient.xyz,
      camera_pos,
      atmo,
      sun_dir,
    );
    lo += ibl.diffuse + ibl.specular;
    ibl_spec_acc = ibl.specular;
  } else {
    lo += material.albedo * lighting.ambient.xyz * 0.15;
  }

  let n_dot_v = max(dot(nrm, view_dir), 0.0);

  for (var i = 0u; i < lighting.light_count; i++) {
    let light = lighting.lights[i];
    let radiance = light.color.xyz * light.color.w;

    var l = vec3f(0.0);
    var atten = 1.0;
    if (light.position_or_dir.w < 0.5) {
      l = normalize(light.position_or_dir.xyz);
    } else {
      let light_pos = light.position_or_dir.xyz;
      l = normalize(light_pos - surface_pos);
      atten = attenuate_point(light_pos, surface_pos, light.params.x);
    }

    let n_dot_l = max(dot(nrm, l), 0.0);
    if (n_dot_l <= 0.0) {
      continue;
    }

    // Terrain self-shadow applies to the directional sun only; point lights are unshadowed.
    let shadow = select(1.0, sun_shadow, light.position_or_dir.w < 0.5);

    let h = normalize(view_dir + l);
    let v_dot_h = max(dot(view_dir, h), 0.0);
    let n_dot_h = max(dot(nrm, h), 0.0);

    let F = fresnel_schlick(v_dot_h, f0);
    let kS = F;
    let kD = (vec3f(1.0) - kS) * (1.0 - material.metallic);
    let diffuse = kD * material.albedo * burley_diffuse(material.roughness, n_dot_v, n_dot_l, v_dot_h);
    let spec = brdf_specular_direct(n_dot_v, n_dot_l, n_dot_h, v_dot_h, material.roughness, f0);
    let contrib = (diffuse + spec) * radiance * n_dot_l * atten * shadow;
    lo += contrib;
    direct_spec_acc += spec * radiance * n_dot_l * atten * shadow;
  }

  let mapped = tone_map_reinhard(lo, overrides.exposure);
  let mapped_direct_spec = tone_map_reinhard(direct_spec_acc, overrides.exposure);
  let mapped_ibl = tone_map_reinhard(ibl_spec_acc, overrides.exposure);

  return LightingResult(mapped, mapped_direct_spec, mapped_ibl);
}
