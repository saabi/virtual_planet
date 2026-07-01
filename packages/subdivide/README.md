# @world-lab/subdivide

Blender-style resizable pane layouts for Svelte 5. The layout tree engine is ported from [saabi/svelte-subdivide](https://github.com/saabi/svelte-subdivide) (LIL); Svelte components land in a follow-up phase.

## Layout document

Serializable layout JSON uses `zone: string` on each pane (opaque key into a host zone registry) instead of upstream `childProps`:

```ts
import {
	createDefaultLayout,
	defaultSceneEditorLayout,
	parseLayoutDocument,
	buildRuntimeTree,
	serializeRuntime
} from '@world-lab/subdivide';

const doc = defaultSceneEditorLayout();
const { root, panes, dividers } = buildRuntimeTree(doc);
const roundTrip = serializeRuntime(root);
```

## Scene editor default

`defaultSceneEditorLayout()` is a horizontal split: left column (~22%) stacks `outliner`, `properties`, and `renderSettings`; right column (~78%) is `viewport`.

## Svelte components (planned)

```svelte
<script>
	import Subdivide from '@world-lab/subdivide/Subdivide.svelte';
</script>

<Subdivide bind:layout zones={zoneSnippets} />
```
