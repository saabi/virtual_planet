#include "atmosphereParams.wgsl"

fn atmosphere_density(h: f32, atmo: AtmosphereParams) -> f32 {
  let scale_h = max(atmo.scale_height, 0.001);
  var rho = exp(-max(h, 0.0) / scale_h);
  let fog_h = max(atmo.fog_height, 0.1);
  if (h < fog_h && atmo.ground_fog_density > 1e-4) {
    rho += atmo.ground_fog_density * exp(-h / (fog_h * 0.25));
  }
  return rho;
}
