# Use.GPU attribution (R2-T1 harvest)

Verified **2026-06-27** against upstream:

- Repository: https://gitlab.com/unconed/use.gpu
- Package: `@use-gpu/wgsl@0.19.0`
- License: **MIT + NMLA** (see `LICENSE.md` in repo root)

MIT+NMLA permits redistribution with copyright notice. The NMLA clause forbids using
the Software as training data for ML systems; ported WGSL snippets in this tree are
used only as shader source, not for training.

Each ported module records `source: use.gpu` and `sourceSymbol` in its YAML frontmatter.
Modules marked `source: reauthored` implement equivalent semantics where upstream code
uses different parameterization (e.g. UV-mask SDFs vs metric signed-distance fields).
