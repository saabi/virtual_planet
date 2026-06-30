# Brief — Swap menu closes on click-outside

**Type:** touch-up (follows `M-node-swap-by-contract`) · **Packages:**
`@virtual-planet/graph-editor` (`NodeSwapMenu.svelte`) · **Depends on:** node-swap ✅
(`cf23086`) · **Contract author:** Opus · **Recommended executor:** Cursor.

## Problem

The node-swap menu (`NodeSwapMenu.svelte`) closes on **Escape** (line 35) and on **select**
(line 31), but **not when you click outside it** — so it lingers over the canvas until you
pick something or press Escape. It should dismiss on an outside pointer press.

## Fix

Add click-outside dismissal, self-contained in `NodeSwapMenu.svelte`:

- Bind the menu root element; in an `$effect`, add a **capture-phase** `pointerdown` listener
  on `window` that calls `onclose()` when `event.target` is **not** within the menu root.
  Remove the listener in the effect cleanup.
- Because the effect runs **after** mount (after the title click that opened the menu already
  fired its `pointerdown`), the listener won't self-close on the opening click — keep it that
  way (don't add it synchronously during the opening event). If a race appears, defer
  attachment one microtask/frame.
- Keep Escape + select close paths. Don't let the outside-click that dismisses also trigger
  canvas pan/marquee unexpectedly — capture-phase + `onclose` only (no `preventDefault` needed
  unless a regression shows).

## Gate

1. **Visual ⚠:** open a node's swap menu, click empty canvas (or another node) → menu closes;
   Escape and selecting still close it; reopening works. Screenshot.
2. **Unit (where testable):** a mounted `NodeSwapMenu` calls `onclose` on a `window`
   `pointerdown` whose target is outside the root, and **not** on a pointerdown inside it.
3. `check` **and** `test` green for `graph-editor`; keep all prior tests green.

## Out of scope

Focus-trap / full modal semantics; closing other popovers (palette) — scope is the swap menu.

## Handoff

→ The swap menu behaves like a normal popover (outside-click dismisses), completing the
node-swap UX.
