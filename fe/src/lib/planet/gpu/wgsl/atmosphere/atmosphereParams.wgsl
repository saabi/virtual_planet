struct AtmosphereParams {
  planet_center: vec3f,
  planet_radius: f32,
  outer_radius: f32,
  scale_height: f32,
  mie_g: f32,
  ground_fog_density: f32,
  rayleigh_strength: f32,
  mie_strength: f32,
  sun_radiance: f32,
  fog_height: f32,
  integrate_steps: f32,
  _pad0: f32,
}
