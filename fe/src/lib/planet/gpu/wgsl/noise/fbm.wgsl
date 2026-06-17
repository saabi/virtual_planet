#include "../common/hash.wgsl"

fn mod289_f(x: f32) -> f32 { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn mod289_v4(x: vec4f) -> vec4f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn perm_v4(x: vec4f) -> vec4f { return mod289_v4((x * 34.0 + 1.0) * x); }

fn noise3(p: vec3f) -> f32 {
  let a = floor(p);
  var d = p - a;
  d = d * d * (3.0 - 2.0 * d);
  let b = a.xxyy + vec4f(0.0, 1.0, 0.0, 1.0);
  let k1 = perm_v4(b.xyxy);
  let k2 = perm_v4(k1.xyxy + b.zzww);
  let c = k2 + a.zzzz;
  let k3 = perm_v4(c);
  let k4 = perm_v4(c + 1.0);
  let o1 = fract(k3 * (1.0 / 41.0));
  let o2 = fract(k4 * (1.0 / 41.0));
  let o3 = o2 * d.z + o1 * (1.0 - d.z);
  let o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);
  return o4.y * d.y + o4.x * (1.0 - d.y);
}

const M3: mat3x3f = mat3x3f(
  vec3f(0.00, 0.80, 0.60),
  vec3f(-0.80, 0.36, -0.48),
  vec3f(-0.60, -0.48, 0.64)
);

fn fbm_4(x: vec3f) -> f32 {
  var p = x;
  var f = 2.0;
  let s = 0.5;
  var a = 0.0;
  var b = 0.5;
  for (var i = 0; i < 4; i++) {
    let n = noise3(p);
    a += b * n;
    b *= s;
    p = f * M3 * p;
  }
  return a;
}
