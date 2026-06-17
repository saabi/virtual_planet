#include "atmosphereParams.wgsl"
#include "raySphere.wgsl"
#include "density.wgsl"
#include "phase.wgsl"

const SUN_STEPS: u32 = 4u;

fn rayleigh_beta(atmo: AtmosphereParams) -> vec3f {
  let radius_ref = max(atmo.planet_radius, 1.0);
  let scale = radius_ref / 100.0;
  return vec3f(0.0058, 0.0135, 0.0331) * atmo.rayleigh_strength * scale;
}

fn mie_beta(atmo: AtmosphereParams) -> vec3f {
  let radius_ref = max(atmo.planet_radius, 1.0);
  let scale = radius_ref / 100.0;
  return vec3f(atmo.mie_strength * 0.004 * scale);
}

fn sun_transmittance(
  pos: vec3f,
  sun_dir: vec3f,
  atmo: AtmosphereParams,
  sigma_t: vec3f,
) -> vec3f {
  let shell_h = atmo.outer_radius - atmo.planet_radius;
  let max_dist = shell_h * 2.0 + atmo.scale_height * 4.0;
  let dt = max_dist / f32(SUN_STEPS);
  var transmittance = vec3f(1.0);
  for (var i = 0u; i < SUN_STEPS; i++) {
    let sample_pos = pos + sun_dir * ((f32(i) + 0.5) * dt);
    let h = altitude_at(sample_pos, atmo.planet_center, atmo.planet_radius);
    if (h < 0.0) {
      return vec3f(0.0);
    }
    if (h > shell_h) {
      break;
    }
    let rho = atmosphere_density(h, atmo);
    transmittance *= exp(-rho * sigma_t * dt);
  }
  return transmittance;
}

/// Integrate single-scattering along a ray. Returns rgb=inscatter, a=avg transmittance.
fn integrate_atmosphere(
  eye: vec3f,
  omega: vec3f,
  t_max: f32,
  sun_dir: vec3f,
  atmo: AtmosphereParams,
) -> vec4f {
  let step_count = u32(clamp(atmo.integrate_steps, 4.0, 24.0));
  let dt = max(t_max, 0.001) / f32(step_count);
  let beta_r = rayleigh_beta(atmo);
  let beta_m = mie_beta(atmo);
  let sigma_t = beta_r + beta_m;

  var transmittance = vec3f(1.0);
  var inscatter = vec3f(0.0);

  for (var i = 0u; i < step_count; i++) {
    let t = (f32(i) + 0.5) * dt;
    if (t > t_max) {
      break;
    }
    let pos = eye + omega * t;
    let h = altitude_at(pos, atmo.planet_center, atmo.planet_radius);
    let shell_h = atmo.outer_radius - atmo.planet_radius;
    if (h < 0.0 || h > shell_h) {
      continue;
    }
    let rho = atmosphere_density(h, atmo);
    let ext = rho * sigma_t;
    let sample_trans = exp(-ext * dt);
    let sun_trans = sun_transmittance(pos, sun_dir, atmo, sigma_t);
    let cos_theta = dot(omega, sun_dir);
    let phase = beta_r * rayleigh_phase(cos_theta) + beta_m * mie_phase(cos_theta, atmo.mie_g);
    inscatter += transmittance * (vec3f(1.0) - sample_trans) * sun_trans * phase * atmo.sun_radiance;
    transmittance *= sample_trans;
  }

  let avg_trans = (transmittance.x + transmittance.y + transmittance.z) / 3.0;
  return vec4f(inscatter, avg_trans);
}
