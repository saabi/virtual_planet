#pragma glslify: export(samplePlanet, PlanetSample)
#pragma glslify: fbm_4 = require('../noise/fbm.glsl')
#pragma glslify: voronoi = require('../noise/voronoi.glsl')

struct PlanetSample {
  vec3 samplePos;
  float distortion;
  vec3 vor;
  float detail;
  float height;
  vec3 op;
  float erosion_value;
};

PlanetSample samplePlanet(vec3 p, const float wl, const float total_amplitude) {
  PlanetSample r;
  r.samplePos = p;
  r.distortion = fbm_4(p*voronoi_distortion_scale);
  r.vor = voronoi(p*voronoi_scale + (r.distortion-0.5)*voronoi_distortion_amplitude);
  r.detail = fbm_4(p*detail_scale);
  r.height = (r.vor.x-0.5)*voronoi_amplitude +(r.detail-0.5)*detail_amplitude;
  float th = r.height - wl;
  float thf;
  if (th > 0.0) 
    thf = total_amplitude-wl;
  else {
    thf = wl-radius;
  }
  th /= thf;
  th = pow(th, erosion);
  r.erosion_value = th;
  th *= thf;
  r.height = wl + th;
  if (render_water > 0.0) {
    p *= radius + max(r.height, wl);
  }
  else {
    p *= radius + r.height;
  }
  r.op = p;
  return r;
}
