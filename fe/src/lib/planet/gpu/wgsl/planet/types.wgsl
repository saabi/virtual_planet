struct PlanetSample {
  unit_dir: vec3f,
  height_meters: f32,
  water_height_meters: f32,
  world_radius_meters: f32,
  distortion: f32,
  vor: vec3f,
  detail: f32,
  erosion_value: f32,
  world_pos: vec3f,
}

struct ScaleContext {
  camera_altitude_meters: f32,
  distance_to_camera_meters: f32,
  meters_per_pixel: f32,
  max_feature_frequency: f32,
  mode: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
}

struct CubeSpherePatchGpu {
  face: u32,
  uv_min_x: f32,
  uv_min_y: f32,
  uv_max_x: f32,
  uv_max_y: f32,
  resolution: u32,
  morph: f32,
  _pad: u32,
}

struct SurfacePatchGpu {
  origin_x: f32,
  origin_y: f32,
  size_meters: f32,
  resolution: u32,
  ring: u32,
  max_feature_meters: f32,
  morph: f32,
  _pad0: u32,
  _pad1: u32,
}
