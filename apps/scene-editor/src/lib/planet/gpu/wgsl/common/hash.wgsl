fn hash3(x: vec3f) -> vec3f {
  let p = vec3f(
    dot(x, vec3f(127.1, 311.7, 74.7)),
    dot(x, vec3f(269.5, 183.3, 246.1)),
    dot(x, vec3f(113.5, 271.9, 124.6))
  );
  return fract(sin(p) * 43758.5453123);
}

fn hash1(n: f32) -> f32 {
  return fract(n * 17.0 * fract(n * 0.3183099));
}
