<script lang="ts">
	import type { AxisLimit, Constraint, LimitRotationConstraint, SceneNode } from '../scene/types.js';

	interface Props {
		node: SceneNode;
		onchange?: (next: Constraint[]) => void;
	}
	let { node, onchange }: Props = $props();

	const DEG = Math.PI / 180;
	const RAD2DEG = 180 / Math.PI;
	const AXES = ['x', 'y', 'z'] as const;

	const constraints = $derived(node.constraints ?? []);

	function commit(next: Constraint[]) {
		onchange?.(next);
	}
	function addLimitRotation() {
		const a = (): AxisLimit => ({ enabled: false, min: 0, max: 0 });
		commit([...constraints, { type: 'limit_rotation', x: a(), y: a(), z: a() }]);
	}
	function remove(i: number) {
		commit(constraints.filter((_, j) => j !== i));
	}
	function setAxis(i: number, axis: 'x' | 'y' | 'z', patch: Partial<AxisLimit>) {
		commit(
			constraints.map((c, j) => {
				if (j !== i || c.type !== 'limit_rotation') return c;
				const cur = c[axis] ?? { enabled: false, min: 0, max: 0 };
				return { ...c, [axis]: { ...cur, ...patch } };
			})
		);
	}
	const lr = (c: Constraint) => c as LimitRotationConstraint;
	const round = (n: number) => Math.round(n * 100) / 100;
</script>

<div class="constraints-editor">
	{#each constraints as c, i (i)}
		{#if c.type === 'limit_rotation'}
			<div class="constraint">
				<div class="con-head">
					<span class="con-type">limit rotation (°)</span>
					<button type="button" class="ico" title="Remove" onclick={() => remove(i)}>×</button>
				</div>
				{#each AXES as axis (axis)}
					{@const lim = lr(c)[axis] ?? { enabled: false, min: 0, max: 0 }}
					<div class="axis">
						<label class="en">
							<input
								type="checkbox"
								checked={lim.enabled}
								onchange={(e) => setAxis(i, axis, { enabled: e.currentTarget.checked })}
							/>
							{axis.toUpperCase()}
						</label>
						<input
							class="num"
							type="number"
							step="any"
							disabled={!lim.enabled}
							value={round(lim.min * RAD2DEG)}
							onchange={(e) => setAxis(i, axis, { min: Number(e.currentTarget.value) * DEG })}
						/>
						<span class="dots">…</span>
						<input
							class="num"
							type="number"
							step="any"
							disabled={!lim.enabled}
							value={round(lim.max * RAD2DEG)}
							onchange={(e) => setAxis(i, axis, { max: Number(e.currentTarget.value) * DEG })}
						/>
					</div>
				{/each}
			</div>
		{/if}
	{/each}
	<button type="button" class="add" onclick={addLimitRotation}>+ limit rotation</button>
</div>

<style>
	.constraints-editor {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.constraint {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.con-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.con-type {
		font-size: 11px;
		opacity: 0.7;
	}

	.axis {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 10px;
	}

	.en {
		display: flex;
		align-items: center;
		gap: 3px;
		flex: 0 0 auto;
		width: 2.4em;
	}

	.num {
		flex: 1;
		min-width: 0;
		background: #1a1f30;
		color: inherit;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		padding: 2px 3px;
		font-size: 10px;
	}

	.num:disabled {
		opacity: 0.4;
	}

	.dots {
		opacity: 0.5;
	}

	.ico {
		background: #1a1f30;
		color: inherit;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		padding: 1px 5px;
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
