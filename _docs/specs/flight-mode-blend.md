# Flight mode blend policy

When transitioning between orbit, flight, and surface-fly rendering:

- **Orbit** (`altitude > 20 km`): cube-sphere patches only.
- **Flight** (`5–50 km`): cube-sphere beyond horizon distance; surface carpet within near field.
- **Surface-fly** (`< 5 km`): surface carpet only; local-frame positions.

Overlap uses depth bias: cube-sphere draws first with standard depth; surface patches use camera-local coordinates with the same depth buffer. Far carpet simplification is masked by atmosphere fog (`atmosphere.wgsl`).

Hysteresis prevents mode flicker — see `cameraModes.ts` thresholds.
