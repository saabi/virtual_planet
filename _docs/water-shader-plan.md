# Water Shader Plan

## Goal

Improve the separated ocean/sea shell so it reads as transparent planetary water rather
than a flat tinted sphere. The first implementation should stay fragment-shader focused
and avoid adding another render pass unless depth/shore information proves insufficient.

## Available Inputs

The water fragment shader should be designed around explicit, documented inputs:

- Water world/eye-relative position.
- Water shell normal.
- View vector.
- Light vector and light color/intensity.
- Scene depth, for terrain/body occlusion and approximate water thickness.
- Eclipse visibility.
- Time, for animated waves and foam.
- Water shell radius and/or planet radius if needed for body-local coordinates.

The shader should avoid relying on hidden assumptions about sphere winding or route-specific
scale. `/scene` water should continue to use the same procedural render radius as terrain.

## Shading Stages

### 1. Base Water

Replace the current simple color model with:

- Deep water color.
- Shallow water color.
- Fresnel from `dot(normal, view)`.
- Sun glint from reflected light/view alignment.
- Eclipse visibility applied to diffuse and glint.

This should make water recognizable even before wave animation.

### 2. Depth Absorption

Use scene depth to approximate water thickness along the view ray:

- Thin water: lighter and more transparent.
- Deep water: darker, more saturated blue.
- Grazing angles: stronger blue absorption/haze.

If scene depth is not stable enough for shore tuning, use terrain surface-distance output or
a dedicated terrain-derived metric later.

### 3. Procedural Wave Normals

Add animated normal perturbation in the fragment shader:

- Two or three directional sine/noise wave layers.
- Body-local coordinates so waves stick to the planet.
- Time-driven phase for animation.
- Small amplitude: initially affect only lighting/specular, not geometry.

This avoids changing tessellation or water mesh topology while improving the surface read.

### 4. Shore Detection

Compute a shore factor from water thickness or terrain-distance data:

- `shore = 1` near terrain/water intersection or very shallow water.
- `shore = 0` in deep water.
- Smooth thresholds to avoid hard rings.

The shore factor should be exposed in a debug view before using it for final foam tuning.

### 5. Animated Shore Foam

Foam should be synchronized with the wave field:

- Reuse the same wave coordinates and time phase used for wave normals.
- Modulate with shore factor so foam appears near coastlines/shallow edges.
- Add noise/pulse variation so foam breaks into patches, not a uniform outline.
- Keep foam animation subtle at planetary scale.

The important contract is that foam movement and wave highlights share a coherent phase,
so shore foam appears driven by the same water motion.

## Debug Views

Add water-focused debug views before heavy tuning:

- Water thickness.
- Shore factor.
- Wave normal intensity.
- Foam mask.

These should be selectable from the existing material/debug view control.

## Initial Controls

Expose only a small set of controls while the model is being validated:

- Water opacity.
- Wave strength.
- Foam strength.
- Shore width.
- Sun glint strength.

Avoid adding a broad editor surface until the shader behavior is stable.

## Recommended Order

1. Fresnel and sun glint.
2. Depth-based absorption.
3. Procedural wave normals.
4. Shore factor debug view.
5. Animated shore foam.
6. Tuning controls.
