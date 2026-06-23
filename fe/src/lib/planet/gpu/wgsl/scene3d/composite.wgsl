// Composites the procedural body's offscreen color over the scene (spheres already drawn
// into the shared color+depth) with an objectOpacity cross-fade — replacing the CSS
// opacity + radial-mask overlay. Step 2 reproduces that mask in-shader; step 3 adds the
// analytic depth test against the scene so nearer bodies aren't covered by the atmosphere.

struct CompositeU {
  mask: vec4f,   // centerX, centerY, r0, r1  (framebuffer pixels)
  params: vec4f, // objectOpacity, viewportW, viewportH, _
}

@group(0) @binding(0) var<uniform> u: CompositeU;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vid: u32) -> VSOut {
  // Fullscreen triangle.
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  let xy = p[vid];
  var out: VSOut;
  out.pos = vec4f(xy, 0.0, 1.0);
  out.uv = vec2f((xy.x + 1.0) * 0.5, (1.0 - xy.y) * 0.5);
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let c = textureSample(tex, samp, in.uv);
  // Radial feather centred on the body, matching the old CSS mask.
  let d = distance(in.pos.xy, u.mask.xy);
  let mask = 1.0 - smoothstep(u.mask.z, u.mask.w, d);
  let a = clamp(u.params.x * mask, 0.0, 1.0);
  return vec4f(c.rgb, a);
}
