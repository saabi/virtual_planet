import { DEFAULT_PRESET, PLANET_PRESETS, type PlanetPresetName } from '../params/presets.js';

const BUILTIN_PREFIX = 'builtin:';
const DOC_PREFIX = 'doc:';

export function builtinSelection(preset: PlanetPresetName): string {
	return `${BUILTIN_PREFIX}${preset}`;
}

export function documentSelection(id: string): string {
	return `${DOC_PREFIX}${id}`;
}

export function parseSelection(
	selection: string
): { kind: 'builtin'; preset: PlanetPresetName } | { kind: 'document'; id: string } | null {
	if (selection.startsWith(BUILTIN_PREFIX)) {
		const preset = selection.slice(BUILTIN_PREFIX.length) as PlanetPresetName;
		if (preset in PLANET_PRESETS) return { kind: 'builtin', preset };
		return null;
	}
	if (selection.startsWith(DOC_PREFIX)) {
		const id = selection.slice(DOC_PREFIX.length);
		if (id) return { kind: 'document', id };
		return null;
	}
	return null;
}

export function defaultSelection(): string {
	return builtinSelection(DEFAULT_PRESET);
}

export function selectionLabel(
	selection: string,
	documentName?: string | null
): string {
	const parsed = parseSelection(selection);
	if (!parsed) return 'unknown';
	if (parsed.kind === 'builtin') return `Preset: ${parsed.preset}`;
	return `Saved: ${documentName ?? 'document'}`;
}
