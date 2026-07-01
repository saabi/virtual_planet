#include "../common/hash.wgsl"

fn voronoi3(x: vec3f) -> vec3f {
  let p = floor(x);
  let f = fract(x);
  var id = 0.0;
  var res = vec2f(100.0);
  for (var k = -1; k <= 1; k++) {
    for (var j = -1; j <= 1; j++) {
      for (var i = -1; i <= 1; i++) {
        let b = vec3f(f32(i), f32(j), f32(k));
        let r = b - f + hash3(p + b);
        let d = dot(r, r);
        if (d < res.x) {
          id = dot(p + b, vec3f(1.0, 57.0, 113.0));
          res = vec2f(d, res.x);
        } else if (d < res.y) {
          res.y = d;
        }
      }
    }
  }
  return vec3f(sqrt(res), abs(id));
}
