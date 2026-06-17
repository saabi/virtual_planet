varying vec3 vor;
varying float detail;
varying float distortion;
varying float height;
varying vec3 op;
varying float erosion_value;
varying vec3 norm;
varying vec4 viewPosition;
varying vec3 samplePos;

uniform float time;
uniform float radius;
uniform float voronoi_amplitude;
uniform float voronoi_albedo;
uniform float voronoi_albedo_y;
uniform float voronoi_albedo_z;
uniform float voronoi_distortion_albedo;
uniform float detail_amplitude;
uniform float detail_albedo;
uniform float render_water;
uniform float water_level;
uniform float sand_cutoff;
uniform float vegetation_level;
uniform float snow_cover;
uniform float texture_noise_scale;
uniform float texture_noise_amplitude;
uniform float polar_scale;
uniform float polar_amplitude;
uniform float illumination;
uniform float normals;
uniform float multisampling;
uniform float fragSampling;
uniform float smoothShading;

uniform float voronoi_scale;
uniform float detail_scale;
uniform float voronoi_distortion_scale;
uniform float voronoi_distortion_amplitude;
uniform float erosion;

const vec3 SUN_POS = vec3(10000.0, 0.0, 0.0);

#pragma glslify: samplePlanet = require('../glsl/planet/kernel.glsl')
#pragma glslify: shadePlanet = require('../glsl/planet/material.glsl')

void main() {
	vec3 col;

  float total_amplitude = voronoi_amplitude+detail_amplitude;
  float wl = total_amplitude*(water_level - 0.5);

  Result r;
  if (fragSampling > 0.0) {
    r = samplePlanet(samplePos, wl, total_amplitude);
  }
  else {
    r.vor = vor;
    r.detail = detail;
    r.distortion = distortion;
    r.height = height;
    r.op = op;
    r.erosion_value = erosion_value;
  }

  col = shadePlanet(r, total_amplitude, wl);

  vec3 n;
  if (smoothShading > 0.0 && multisampling > 0.0) {
    n = norm;
  }
  else {
    n = normalize( cross( dFdx( viewPosition.xyz ), dFdy( viewPosition.xyz ) ) );
  }
  if (illumination > 0.0) {
    vec4 sp = viewMatrix * vec4(SUN_POS,1.0);
    vec3 lightDir = normalize(sp.xyz - r.op);
    float diff = max(dot(n, lightDir), 0.0);
    col *= diff;
  }

	gl_FragColor = vec4( col, 1.0 );
  if (normals > 0.0) {
	  gl_FragColor = vec4(n, 1.0);
  }
}
