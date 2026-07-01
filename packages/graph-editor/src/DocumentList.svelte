<script module lang="ts">
	import type { DocumentListEntry } from './graphArtifact.js';
	import type { GraphArtifact } from './graphArtifact.js';

	export interface DocumentListActions {
		onNew: () => void;
		onSave: () => void;
		onSaveAs: (name: string) => void;
		onLoadSaved: (name: string) => void;
		onLoadSample: (artifact: GraphArtifact) => void;
		onRename: (fromName: string, toName: string) => void;
		onDelete: (name: string) => void;
		onDownload: () => void;
		onUpload: () => void;
		onLoadLayoutChange: (enabled: boolean) => void;
	}
</script>

<script lang="ts">
	let {
		activeName = null,
		readOnly = false,
		loadLayout = true,
		savedDocuments = [],
		sampleDocuments = [],
		statusMessage = null,
		actions
	}: {
		activeName?: string | null;
		readOnly?: boolean;
		loadLayout?: boolean;
		savedDocuments?: DocumentListEntry[];
		sampleDocuments?: GraphArtifact[];
		statusMessage?: string | null;
		actions: DocumentListActions;
	} = $props();

	let saveAsOpen = $state(false);
	let saveAsName = $state('');
	let renameOpen = $state(false);
	let renameFrom = $state('');
	let renameTo = $state('');

	function openSaveAs() {
		saveAsName = activeName ?? '';
		saveAsOpen = true;
	}

	function confirmSaveAs() {
		const name = saveAsName.trim();
		if (!name) return;
		actions.onSaveAs(name);
		saveAsOpen = false;
	}

	function openRename(name: string) {
		renameFrom = name;
		renameTo = name;
		renameOpen = true;
	}

	function confirmRename() {
		const to = renameTo.trim();
		if (!to || !renameFrom) return;
		actions.onRename(renameFrom, to);
		renameOpen = false;
	}
</script>

<div class="document-list">
	<div class="document-row">
		<button type="button" onclick={actions.onNew}>New</button>
		<button type="button" disabled={readOnly} onclick={actions.onSave}>Save</button>
		<button type="button" onclick={openSaveAs}>Save As</button>
		<button type="button" onclick={actions.onDownload}>Download</button>
		<button type="button" onclick={actions.onUpload}>Upload</button>
		<label class="layout-toggle">
			<input
				type="checkbox"
				checked={loadLayout}
				onchange={(event) =>
					actions.onLoadLayoutChange((event.currentTarget as HTMLInputElement).checked)}
			/>
			<span>Load layout</span>
		</label>
	</div>

	<div class="document-panels">
		<section class="panel">
			<h2>Saved</h2>
			{#if savedDocuments.length === 0}
				<p class="empty">No saved documents yet.</p>
			{:else}
				<ul class="entries">
					{#each savedDocuments as entry (entry.name)}
						<li class:active={entry.name === activeName}>
							<button type="button" class="load" onclick={() => actions.onLoadSaved(entry.name)}>
								{entry.name}
							</button>
							<div class="entry-actions">
								<button type="button" onclick={() => openRename(entry.name)}>Rename</button>
								<button type="button" onclick={() => actions.onDelete(entry.name)}>Delete</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="panel">
			<h2>Examples</h2>
			<ul class="entries">
				{#each sampleDocuments as sample (sample.name)}
					<li class:active={readOnly && sample.name === activeName}>
						<button type="button" class="load" onclick={() => actions.onLoadSample(sample)}>
							{sample.name}
						</button>
						<span class="badge">sample</span>
					</li>
				{/each}
			</ul>
		</section>
	</div>

	{#if statusMessage}
		<p class="status">{statusMessage}</p>
	{/if}

	{#if saveAsOpen}
		<div class="dialog-backdrop" role="presentation" onclick={() => (saveAsOpen = false)}></div>
		<div class="dialog" role="dialog" aria-label="Save document as">
			<label>
				<span>Name</span>
				<input bind:value={saveAsName} />
			</label>
			<div class="dialog-actions">
				<button type="button" onclick={() => (saveAsOpen = false)}>Cancel</button>
				<button type="button" onclick={confirmSaveAs}>Save</button>
			</div>
		</div>
	{/if}

	{#if renameOpen}
		<div class="dialog-backdrop" role="presentation" onclick={() => (renameOpen = false)}></div>
		<div class="dialog" role="dialog" aria-label="Rename document">
			<label>
				<span>New name</span>
				<input bind:value={renameTo} />
			</label>
			<div class="dialog-actions">
				<button type="button" onclick={() => (renameOpen = false)}>Cancel</button>
				<button type="button" onclick={confirmRename}>Rename</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.document-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
		min-width: 0;
	}

	.document-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}

	.document-row button,
	.entry-actions button,
	.dialog-actions button {
		font-size: 11px;
		padding: 4px 8px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		background: #1a1f30;
		color: inherit;
		cursor: pointer;
	}

	.document-row button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.layout-toggle {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		margin-left: 4px;
	}

	.document-panels {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		max-height: 120px;
		overflow: auto;
	}

	.panel h2 {
		margin: 0 0 4px;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		opacity: 0.65;
	}

	.empty {
		margin: 0;
		font-size: 10px;
		opacity: 0.6;
	}

	.entries {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.entries li {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
	}

	.entries li.active .load {
		border-color: rgba(120, 180, 255, 0.55);
	}

	.load {
		flex: 1;
		text-align: left;
		padding: 3px 6px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 4px;
		background: #151a28;
		color: inherit;
		cursor: pointer;
	}

	.badge {
		font-size: 9px;
		opacity: 0.55;
		text-transform: uppercase;
	}

	.status {
		margin: 0;
		font-size: 11px;
		opacity: 0.7;
	}

	.dialog-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		z-index: 20;
	}

	.dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 21;
		background: #1a1f30;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 6px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 240px;
	}

	.dialog label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 11px;
	}

	.dialog input {
		font-size: 11px;
		padding: 4px 8px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		background: #12151f;
		color: inherit;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 6px;
	}
</style>
