struct LocalFrame {
  origin_ecef: vec4f,
  east: vec4f,
  north: vec4f,
  up: vec4f,
  planet_center_local: vec4f,
  camera_local: vec4f,
}

fn cube_face_uv_to_unit_dir(face: u32, u: f32, v: f32) -> vec3f {
  let a = u * 2.0 - 1.0;
  let b = v * 2.0 - 1.0;
  var pos = vec3f(0.0, 0.0, 1.0);
  switch (face) {
    case 0u: { pos = vec3f(1.0, b, -a); }
    case 1u: { pos = vec3f(-1.0, b, a); }
    case 2u: { pos = vec3f(a, 1.0, -b); }
    case 3u: { pos = vec3f(a, -1.0, b); }
    case 4u: { pos = vec3f(a, b, 1.0); }
    default: { pos = vec3f(-a, b, -1.0); }
  }
  return normalize(pos);
}

fn tangent_offset_to_unit_dir(local_xy: vec2f, frame: LocalFrame) -> vec3f {
  let east = frame.east.xyz;
  let north = frame.north.xyz;
  let offset = east * local_xy.x + north * local_xy.y;
  let world_pos = offset - frame.planet_center_local.xyz;
  return normalize(world_pos);
}
