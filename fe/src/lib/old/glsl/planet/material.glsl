#pragma glslify: export(shadePlanet)
#pragma glslify: fbm_4 = require('../noise/fbm.glsl')

const vec3 ROCK = vec3(0.50, 0.35, 0.15);
const vec3 TREE = vec3(0.05, 1.15, 0.10);
const vec3 SAND = vec3(1.00, 1.00, 0.85);
const vec3 ICE  = vec3(0.85, 1.00, 1.20);
const vec3 SHALLOW_WATER = vec3(0.4, 1.0, 1.9);
const vec3 DEEP_WATER = vec3(0, 0.1, 0.7);

vec3 shadePlanet(vec3 vor, float distortion, float detail, float height, vec3 op, float total_amplitude, float wl) {
  float spots = vor.x*(1.0-voronoi_albedo) + voronoi_albedo;
  spots *= vor.y*(1.0-voronoi_albedo_y) + voronoi_albedo_y;
  spots *= vor.z*(1.0-voronoi_albedo_z) + voronoi_albedo_z;
  spots *= distortion*(1.0-voronoi_distortion_albedo) + voronoi_distortion_albedo;
  spots *= detail*(1.0-detail_albedo) + detail_albedo;
  vec3 col = ROCK * vec3(spots);
  float tn = (fbm_4(op*sqrt(texture_noise_scale))-0.5)*texture_noise_amplitude;
  float polar = ((abs(op.y)/radius)-polar_scale)*polar_amplitude;
  float h = height + tn + polar;
  float tl = h / total_amplitude;
  if (tl < pow(vegetation_level,2.)) {
    col = TREE * vec3(spots);
  }
  if (tl < pow(sand_cutoff,2.))
    col = SAND * vec3(spots);
  if (render_water > 0.0 && height <= wl) {
    float depth = spots;
    depth = sqrt(depth);
    col = mix(SHALLOW_WATER, DEEP_WATER, depth);
  }
  if (tl > pow(snow_cover,2.)) {
    col = ICE+tl;
    if (render_water > 0.0 && height > wl)
      col *= vec3(spots);
  }
  return col;
}
