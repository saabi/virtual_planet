/// Ray-sphere intersection. Returns (t_enter, t_exit); negative if miss.
fn ray_sphere_intersect(ro: vec3f, rd: vec3f, center: vec3f, radius: f32) -> vec2f {
  let oc = ro - center;
  let b = dot(oc, rd);
  let c = dot(oc, oc) - radius * radius;
  let disc = b * b - c;
  if (disc < 0.0) {
    return vec2f(-1.0, -1.0);
  }
  let s = sqrt(disc);
  return vec2f(-b - s, -b + s);
}

fn altitude_at(pos: vec3f, center: vec3f, planet_radius: f32) -> f32 {
  return length(pos - center) - planet_radius;
}
