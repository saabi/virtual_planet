const RAYLEIGH_PHASE_COEFF: f32 = 3.0 / (16.0 * 3.14159265);

fn rayleigh_phase(cos_theta: f32) -> f32 {
  return RAYLEIGH_PHASE_COEFF * (1.0 + cos_theta * cos_theta);
}

fn mie_phase(cos_theta: f32, g: f32) -> f32 {
  let g2 = g * g;
  let denom = pow(1.0 + g2 - 2.0 * g * cos_theta, 1.5);
  return (1.0 - g2) / (4.0 * 3.14159265 * max(denom, 1e-4));
}
