<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import SceneViewport3D from '$lib/planet/components/SceneViewport3D.svelte';
	import { listResolvedSystems, type ResolvedSunDogSystem } from '$lib/planet/sundog/catalog.js';
	import { galaxyLayout, type LayoutMode } from '$lib/planet/sundog/galaxyLayout.js';
	import {
		createGalaxyScene,
		starNodeId,
		systemIdFromNode
	} from '$lib/planet/sundog/galaxyScene.js';
	import { createSceneFromCatalogSystem } from '$lib/planet/sundog/createSceneFromCatalogSystem.js';
	import { serializeScene, SYSTEM_SCENE_KEY } from '$lib/planet/scene/sceneDocument.js';
	import { effectiveTrade, formatEffectiveTrade } from '$lib/planet/sundog/sim/trade.js';
	import { seasonLabel } from '$lib/planet/sundog/sim/insolation.js';

	const systems = listResolvedSystems();

	let mode = $state<LayoutMode>('real');
	let seed = $state(1);
	let selectedNodeId = $state<string | null>(null);

	let layout = $derived(galaxyLayout(
		systems.map((s) => s.extracted),
		mode,
		seed
	));
	let galaxyScene = $derived(createGalaxyScene(
		systems.map((s) => s.extracted),
		layout
	));
	let selectedSystem = $derived.by<ResolvedSunDogSystem | null>(() => {
		const id = systemIdFromNode(selectedNodeId);
		return id ? (systems.find((s) => s.extracted.id === id) ?? null) : null;
	});

	function shuffle() {
		seed = (Math.random() * 0xffffffff) >>> 0;
		mode = 'shuffle';
	}

	function realPositions() {
		mode = 'real';
	}

	function select(resolved: ResolvedSunDogSystem) {
		selectedNodeId = starNodeId(resolved.extracted.id);
	}

	function openInScene(resolved: ResolvedSunDogSystem) {
		const scene = createSceneFromCatalogSystem(resolved.extracted);
		if (browser) {
			try {
				localStorage.setItem(SYSTEM_SCENE_KEY, serializeScene(scene));
			} catch {
				/* private mode / quota — the scene route falls back to its default */
			}
		}
		goto('/scene');
	}

	function fmt(v: number | null, suffix = ''): string {
		return v === null ? '—' : `${v}${suffix}`;
	}

	function truncateNotes(notes: string | null, max = 140): string {
		if (!notes) return '';
		return notes.length <= max ? notes : `${notes.slice(0, max)}…`;
	}

	const SCENE_EPOCH = 0;
</script>

<svelte:head>
	<title>SunDog — Galaxy Map</title>
</svelte:head>

<div class="galaxy">
	<div class="viewport">
		<SceneViewport3D scene={galaxyScene} bind:selectedId={selectedNodeId} />
		<div class="toolbar">
			<strong>Galaxy Map</strong>
			<span class="hint">{systems.length} systems · click a star</span>
			<button type="button" class:active={mode === 'real'} onclick={realPositions}>
				Real positions
			</button>
			<button type="button" class:active={mode === 'shuffle'} onclick={shuffle}>Shuffle</button>
		</div>
	</div>

	<aside class="panel">
		{#if selectedSystem}
			{@const sys = selectedSystem.extracted}
			{@const enrich = selectedSystem.enrichment}
			<header>
				<h1>{sys.name}</h1>
				<span class="code">{sys.code}</span>
				{#if enrich}<span class="tag authored">enriched</span>{/if}
			</header>

			<section>
				<h2>Star</h2>
				<dl>
					<dt>Class</dt>
					<dd>{sys.star.starClass}</dd>
					<dt>Temperature</dt>
					<dd>{fmt(sys.star.temperatureK, ' K')}</dd>
					<dt>Radius</dt>
					<dd>{fmt(sys.star.radiusSolar, ' R☉')}</dd>
					<dt>Luminosity</dt>
					<dd>{fmt(sys.star.luminositySolar, ' L☉')}</dd>
				</dl>
			</section>

			<section>
				<h2>Economy</h2>
				<dl>
					<dt>Price modifier</dt>
					<dd>{fmt(sys.game.priceModifier)}</dd>
					<dt>Pirate activity</dt>
					<dd>{fmt(sys.game.pirateActivity)}</dd>
					<dt>Planets</dt>
					<dd>{sys.bodies.length}</dd>
					{#if enrich?.additions?.length}
						<dt>Authored bodies</dt>
						<dd>{enrich.additions.length}</dd>
					{/if}
				</dl>
			</section>

			<section>
				<h2>Planets</h2>
				<ul class="planets">
					{#each sys.bodies as body (body.id)}
						{@const bodyEnrich = selectedSystem.bodyEnrichments.get(body.id)}
						{@const orbit = bodyEnrich?.orbit}
						{@const gameplay = bodyEnrich?.gameplay}
						{@const trade = effectiveTrade(body, sys, SCENE_EPOCH, gameplay, orbit)}
						<li>
							<div class="planet-head">
								<span class="planet-name">{body.name}</span>
								<span class="terrain">{body.render.terrain ?? 'Unknown'}</span>
							</div>
							<div class="planet-stats">
								<span>Orbit {fmt(body.render.orbit.distanceToStarAu, ' AU')}</span>
								<span>Period {fmt(body.render.orbit.orbitPeriodDays, ' d')}</span>
								<span>Gravity {fmt(body.render.gravityG, ' g')}</span>
								<span>Wealth {fmt(body.game.wealth)}</span>
								<span>Pop {fmt(body.game.population)}</span>
								{#if orbit?.eccentricity}
									<span>e {orbit.eccentricity.toFixed(2)}</span>
								{/if}
								{#if orbit?.inclinationDeg}
									<span>i {orbit.inclinationDeg.toFixed(1)}°</span>
								{/if}
								{#if body.render.habitable}<span class="tag">habitable</span>{/if}
								{#if gameplay?.seasonality}
									<span class="tag season">{gameplay.seasonality} seasons</span>
								{/if}
							</div>
							{#if gameplay?.flavor}
								<p class="flavor">{gameplay.flavor}</p>
							{/if}
							{#if body.game.notes}
								<p class="notes">{truncateNotes(body.game.notes)}</p>
							{/if}
							{#if trade !== null}
								<div class="trade-hint">
									Trade ~{formatEffectiveTrade(trade)} at epoch
									<span class="muted">({seasonLabel(body, SCENE_EPOCH, orbit)})</span>
								</div>
							{/if}
							{#if body.game.cities.length > 0}
								<div class="cities">
									Cities: {body.game.cities.map((c) => c.name + (c.starport ? ' ★' : '')).join(', ')}
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</section>

			<button type="button" class="open" onclick={() => openInScene(selectedSystem)}>
				Open “{sys.name}” in Scene Editor →
			</button>

			<p class="provenance">
				Source: {sys.provenance.source} ({sys.provenance.kind})
				{#if enrich}
					· enrichment: {enrich.provenance.source}
				{/if}
			</p>
		{:else}
			<div class="empty">
				<h1>SunDog Galaxy</h1>
				<p>
					Select a star to inspect its system — star class, economy, planets, and cities — then
					open it in the scene editor.
				</p>
				<p class="muted">
					Default layout uses each system's real galaxy coordinates. <em>Shuffle</em> re-lays them
					out, echoing the original game's per-game randomization.
				</p>
				<h2>Systems</h2>
				<ul class="system-list">
					{#each systems as resolved (resolved.extracted.id)}
						<li>
							<button type="button" onclick={() => select(resolved)}>
								<span>{resolved.extracted.name}</span>
								<span class="code">{resolved.extracted.code}</span>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</aside>
</div>

<style>
	.galaxy {
		position: fixed;
		inset: 0;
		display: grid;
		grid-template-columns: 1fr 340px;
		background: #04060d;
		color: #e8ecf8;
		font: 13px/1.5 system-ui, sans-serif;
	}

	.viewport {
		position: relative;
		min-width: 0;
	}

	.toolbar {
		position: absolute;
		top: 12px;
		left: 12px;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 10px;
		border-radius: 8px;
		background: rgba(10, 14, 26, 0.82);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.toolbar .hint {
		color: #9aa6c4;
		font-size: 11px;
	}

	.toolbar button {
		font: 12px system-ui, sans-serif;
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(30, 38, 60, 0.9);
		color: #e8ecf8;
		cursor: pointer;
	}

	.toolbar button.active {
		border-color: rgba(158, 192, 255, 0.6);
		background: rgba(60, 90, 140, 0.9);
	}

	.panel {
		overflow-y: auto;
		padding: 18px;
		border-left: 1px solid rgba(255, 255, 255, 0.08);
		background: #080b15;
	}

	.panel header {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 12px;
	}

	.panel h1 {
		margin: 0;
		font-size: 20px;
	}

	.panel .code {
		font-family: ui-monospace, monospace;
		color: #9aa6c4;
		font-size: 12px;
	}

	.panel h2 {
		margin: 16px 0 6px;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #8da0c8;
	}

	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2px 12px;
		margin: 0;
	}

	dt {
		color: #9aa6c4;
	}

	dd {
		margin: 0;
		text-align: right;
	}

	.planets {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.planets li {
		padding: 8px 10px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.planet-head {
		display: flex;
		justify-content: space-between;
		font-weight: 600;
	}

	.terrain {
		color: #9ec0ff;
		font-weight: 400;
	}

	.planet-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 10px;
		margin-top: 4px;
		color: #b6c0da;
		font-size: 12px;
	}

	.tag {
		color: #7ee0a8;
	}

	.tag.authored {
		color: #c9a8ff;
	}

	.tag.season {
		color: #ffc87e;
	}

	.flavor {
		margin: 6px 0 0;
		font-size: 12px;
		color: #d4dcf0;
		font-style: italic;
	}

	.notes {
		margin: 4px 0 0;
		font-size: 11px;
		color: #8da0c8;
		line-height: 1.4;
	}

	.trade-hint {
		margin-top: 4px;
		font-size: 11px;
		color: #9ec0ff;
	}

	.trade-hint .muted {
		color: #6b7794;
	}

	.cities {
		margin-top: 4px;
		font-size: 11px;
		color: #8da0c8;
	}

	.open {
		margin-top: 18px;
		width: 100%;
		padding: 10px;
		border-radius: 8px;
		border: 1px solid rgba(158, 192, 255, 0.5);
		background: rgba(60, 90, 140, 0.9);
		color: #fff;
		font: 600 13px system-ui, sans-serif;
		cursor: pointer;
	}

	.open:hover {
		background: rgba(80, 115, 175, 0.95);
	}

	.provenance {
		margin-top: 12px;
		font-size: 11px;
		color: #6b7794;
	}

	.empty h1 {
		margin: 0 0 10px;
		font-size: 20px;
	}

	.empty .muted {
		color: #8da0c8;
	}

	.system-list {
		list-style: none;
		margin: 12px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.system-list button {
		display: flex;
		justify-content: space-between;
		width: 100%;
		padding: 7px 10px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		color: #e8ecf8;
		font: 13px system-ui, sans-serif;
		cursor: pointer;
		text-align: left;
	}

	.system-list button:hover {
		border-color: rgba(158, 192, 255, 0.5);
		background: rgba(60, 90, 140, 0.4);
	}
</style>
