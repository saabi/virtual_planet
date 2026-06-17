#define PI 3.141592653589793
const int SAMPLES = 4;
uniform vec3 ares;

attribute float aIdx;

uniform mat4 inverseModelMatrix;

uniform float angle;
uniform float radius;
uniform float multisampling;
uniform float smoothShading;

uniform float voronoi_scale;
uniform float voronoi_amplitude;
uniform float detail_scale;
uniform float detail_amplitude;
uniform float voronoi_distortion_scale;
uniform float voronoi_distortion_amplitude;

uniform float water_level;
uniform float render_water;

uniform float erosion;

varying float distortion;
varying vec3 vor;
varying float detail;
varying float height;
varying vec3 op;
varying float erosion_value;
varying vec3 norm;
varying vec4 viewPosition;
varying vec3 samplePos;

#pragma glslify: samplePlanet = require('../glsl/planet/kernel.glsl')

mat3 calcLookAtMatrix(vec3 origin, vec3 target, float roll) {
    vec3 rr = vec3(sin(roll), cos(roll), 0.0);
    vec3 ww = normalize(target - origin);
    vec3 uu = normalize(cross(ww, rr));
    vec3 vv = normalize(cross(uu, ww));

    return mat3(uu, vv, ww);
}

Result sample2(vec2 a, const float wl, const float total_amplitude, mat3 lookAt) {
  vec3 pp = lookAt * vec3(cos(a.x)*sin(a.y), sin(a.x)*sin(a.y), cos(a.y));
  return samplePlanet( pp,wl, total_amplitude);
}

void main() {
  vec3 cam = (inverseModelMatrix * vec4(cameraPosition,1.0)).xyz;
  mat3 lookAt = calcLookAtMatrix(vec3(0.0), cam, 0.0);

  float total_amplitude = voronoi_amplitude+detail_amplitude;
  float wl = total_amplitude*(water_level - 0.5);

  vec3 p = position + vec3(0.5,0.5,0.0);
  p /= vec3(ares.xy,1.0);
  float y = floor(aIdx / ares.x)/ares.y;
  float x = mod(aIdx, ares.x)/ares.x;
  vec2 p2 = vec2((x+p.x) * PI * 2.0 , (y+p.y)*angle);

  Result acc = sample2(p2, wl, total_amplitude, lookAt);
  vec3 r1 = acc.op;
  samplePos = acc.samplePos;

  float count = 1.0;
  vec3 samples[SAMPLES==0?1:SAMPLES];
  if (multisampling > 0.0 && SAMPLES > 0) {
    float s = SAMPLES==0?0.000001:float(SAMPLES);
    for (int i = 0; i < SAMPLES; i++) {
      float a = PI*2.0/s*float(i)+PI/s;

      Result r = sample2(p2 + vec2(sin(a)/(ares.x*ares.z), cos(a)/(ares.y*ares.z)*angle)*1.414, wl, total_amplitude, lookAt);
      acc.vor += r.vor;
      acc.height += r.height;
      acc.distortion += r.distortion;
      acc.detail += r.detail;
      acc.op += r.op;
      acc.erosion_value += r.erosion_value;
      samples[i] = normalize(r.op-r1);
    }
    count += float(SAMPLES);
  }

  acc.vor /= count;
  acc.height /= count;
  acc.distortion /= count;
  acc.detail /= count;
  acc.op /= count;
  acc.erosion_value /= count;


  vor = acc.vor;
  height = acc.height;
  distortion = acc.distortion;
  detail = acc.detail;
  op = acc.op;
  erosion_value = acc.erosion_value;

  if (smoothShading > 0.0 && multisampling > 0.0 && SAMPLES > 3) {
    norm = normalize(cross(samples[0],samples[1])); 
    norm += normalize(cross(samples[1],samples[2])); 
    norm += normalize(cross(samples[2],samples[3])); 
    norm += normalize(cross(samples[3],samples[0])); 
    norm /= -4.0;

    norm = normalMatrix * norm;
  }
  
  viewPosition =  modelViewMatrix * vec4(op, 1.0);
  gl_Position = projectionMatrix * viewPosition;
}
