<script lang="ts">
	import type { FieldTerm, SceneNode, TermOp, TransformField } from '../scene/types.js';

	interface Props {
		node: SceneNode;
		onchange?: (next: FieldTerm[]) => void;
	}
	let { node, onchange }: Props = $props();

	const CHANNELS: TransformField[] = [
		'positionX',
		'positionY',
		'positionZ',
		'rotationX',
		'rotationY',
		'rotationZ',
		'scaleX',
		'scaleY',
		'scaleZ'
	];
	const OPS: TermOp[] = ['set', 'add', 'mul'];

	const terms = $derived(node.bindings ?? []);

	function commit(next: FieldTerm[]) {
		onchange?.(next);
	}
	function patch(i: number, p: Partial<FieldTerm>) {
		commit(terms.map((t, j) => (j === i ? { ...t, ...p } : t)));
	}
	function remove(i: number) {
		commit(terms.filter((_, j) => j !== i));
	}
	function move(i: number, d: -1 | 1) {
		const j = i + d;
		if (j < 0 || j >= terms.length) return;
		const next = [...terms];
		[next[i], next[j]] = [next[j], next[i]];
		commit(next);
	}
	function add() {
		commit([
			...terms,
			{ field: 'positionX', op: terms.length ? 'add' : 'set', source: { ref: '..', output: '' } }
		]);
	}
	function setKind(i: number, kind: 'ref' | 'const') {
		patch(i, { source: kind === 'const' ? { const: 0 } : { ref: '..', output: '' } });
	}

	const isConst = (t: FieldTerm) => 'const' in t.source;
	const refOf = (t: FieldTerm) => ('ref' in t.source ? t.source.ref : '');
	const outputOf = (t: FieldTerm) => ('output' in t.source ? t.source.output : '');
	const constOf = (t: FieldTerm) => ('const' in t.source ? t.source.const : 0);
</script>

<div class="bindings-editor">
	{#each terms as t, i (i)}
		<div class="term">
			<select
				class="cell field"
				value={t.field}
				onchange={(e) => patch(i, { field: e.currentTarget.value as TransformField })}
			>
				{#each CHANNELS as ch (ch)}
					<option value={ch}>{ch}</option>
				{/each}
			</select>
			<select
				class="cell op"
				value={t.op ?? 'set'}
				onchange={(e) => patch(i, { op: e.currentTarget.value as TermOp })}
			>
				{#each OPS as op (op)}
					<option value={op}>{op}</option>
				{/each}
			</select>
			<select
				class="cell kind"
				value={isConst(t) ? 'const' : 'ref'}
				onchange={(e) => setKind(i, e.currentTarget.value as 'ref' | 'const')}
			>
				<option value="ref">ref</option>
				<option value="const">const</option>
			</select>
			{#if isConst(t)}
				<input
					class="cell src"
					type="number"
					step="any"
					value={constOf(t)}
					onchange={(e) => patch(i, { source: { const: Number(e.currentTarget.value) } })}
				/>
			{:else}
				<input
					class="cell src ref-path"
					type="text"
					placeholder="path"
					value={refOf(t)}
					onchange={(e) =>
						patch(i, { source: { ref: e.currentTarget.value, output: outputOf(t) } })}
				/>
				<input
					class="cell src output"
					type="text"
					placeholder="output"
					value={outputOf(t)}
					onchange={(e) => patch(i, { source: { ref: refOf(t), output: e.currentTarget.value } })}
				/>
			{/if}
			<button type="button" class="ico" title="Move up" onclick={() => move(i, -1)}>↑</button>
			<button type="button" class="ico" title="Move down" onclick={() => move(i, 1)}>↓</button>
			<button type="button" class="ico" title="Remove" onclick={() => remove(i)}>×</button>
		</div>
	{/each}
	<button type="button" class="add" onclick={add}>+ term</button>
</div>

<style>
	.bindings-editor {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.term {
		display: flex;
		gap: 3px;
		align-items: center;
	}

	.cell {
		background: #1a1f30;
		color: inherit;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		padding: 2px 3px;
		font-size: 10px;
		min-width: 0;
	}

	.field {
		flex: 1.4;
	}
	.op,
	.kind {
		flex: 0 0 auto;
	}
	.src {
		flex: 1.2;
	}

	.ico {
		flex: 0 0 auto;
		background: #1a1f30;
		color: inherit;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		padding: 1px 4px;
		font-size: 11px;
		cursor: pointer;
	}

	.add {
		align-self: flex-start;
		background: rgba(124, 92, 255, 0.12);
		color: #c7a6ff;
		border: 1px solid rgba(124, 92, 255, 0.3);
		border-radius: 4px;
		padding: 2px 8px;
		font-size: 11px;
		cursor: pointer;
	}
</style>
