import { parseSnapshot } from './parse.js';
import { coerceSnapshot } from './schema.js';
import {
	CURRENT_SNAPSHOT_VERSION,
	type PlanetDocumentRegistry,
	type PlanetSessionEnvelope,
	type PlanetSnapshot,
	type StoredPlanetDocument
} from './types.js';

const REGISTRY_KEY = 'virtual-planet:documents:v1';
const SESSION_KEY = 'virtual-planet:session:v1';

function hasLocalStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

function readRegistry(): PlanetDocumentRegistry {
	if (!hasLocalStorage()) return { schemaVersion: CURRENT_SNAPSHOT_VERSION, documents: [] };
	try {
		const raw = localStorage.getItem(REGISTRY_KEY);
		if (!raw) return { schemaVersion: CURRENT_SNAPSHOT_VERSION, documents: [] };
		const parsed = JSON.parse(raw) as Partial<PlanetDocumentRegistry>;
		if (!Array.isArray(parsed.documents)) {
			return { schemaVersion: CURRENT_SNAPSHOT_VERSION, documents: [] };
		}

		let migratedCount = 0;
		const documents = parsed.documents
			.map((doc) => {
				if (!doc || typeof doc !== 'object') return null;
				const id = typeof doc.id === 'string' ? doc.id : '';
				const name = typeof doc.name === 'string' ? doc.name : '';
				const updatedAt = typeof doc.updatedAt === 'number' ? doc.updatedAt : Date.now();
				const parsedSnapshot = parseSnapshot(doc.snapshot);
				if (parsedSnapshot.rejectReason === 'newer') {
					console.warn(`[planet/documents] Skipping document "${name}" (${id}): newer schema.`);
					return null;
				}
				if (!id || !name || !parsedSnapshot.snapshot) {
					if (id || name) {
						console.warn(`[planet/documents] Skipping corrupt document "${name}" (${id}).`);
					}
					return null;
				}
				if (parsedSnapshot.migrated) migratedCount += 1;
				return {
					id,
					name,
					updatedAt,
					snapshot: parsedSnapshot.snapshot
				} satisfies StoredPlanetDocument;
			})
			.filter((doc): doc is StoredPlanetDocument => doc !== null);

		const registry: PlanetDocumentRegistry = {
			schemaVersion: CURRENT_SNAPSHOT_VERSION,
			documents
		};
		if (migratedCount > 0) {
			console.warn(`[planet/documents] Migrated ${migratedCount} document(s) to current schema.`);
			writeRegistry(registry);
		}
		return registry;
	} catch {
		return { schemaVersion: CURRENT_SNAPSHOT_VERSION, documents: [] };
	}
}

function writeRegistry(registry: PlanetDocumentRegistry): void {
	if (!hasLocalStorage()) return;
	localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

export function listDocuments(): StoredPlanetDocument[] {
	return [...readRegistry().documents].sort((a, b) => a.name.localeCompare(b.name));
}

export function getDocument(id: string): StoredPlanetDocument | null {
	return readRegistry().documents.find((doc) => doc.id === id) ?? null;
}

export function upsertDocument(doc: StoredPlanetDocument): boolean {
	const snapshot = coerceSnapshot(doc.snapshot);
	if (!snapshot) {
		console.warn(`[planet/documents] Refusing to save corrupt snapshot for "${doc.name}" (${doc.id}).`);
		return false;
	}
	const registry = readRegistry();
	const normalized: StoredPlanetDocument = { ...doc, snapshot };
	const index = registry.documents.findIndex((entry) => entry.id === doc.id);
	if (index >= 0) registry.documents[index] = normalized;
	else registry.documents.push(normalized);
	writeRegistry(registry);
	return true;
}

export function deleteDocument(id: string): boolean {
	const registry = readRegistry();
	const next = registry.documents.filter((doc) => doc.id !== id);
	if (next.length === registry.documents.length) return false;
	writeRegistry({ schemaVersion: CURRENT_SNAPSHOT_VERSION, documents: next });
	return true;
}

export function readSession(): PlanetSessionEnvelope | null {
	if (!hasLocalStorage()) return null;
	try {
		const raw = localStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<PlanetSessionEnvelope>;
		if (typeof parsed.schemaVersion !== 'number') return null;
		if (parsed.schemaVersion > CURRENT_SNAPSHOT_VERSION) {
			console.warn('[planet/documents] Session schema is newer than app; skipping restore.');
			return null;
		}
		const snapshotResult = parseSnapshot(parsed.snapshot);
		if (!snapshotResult.snapshot) return null;
		const activeDocumentId =
			typeof parsed.activeDocumentId === 'string' || parsed.activeDocumentId === null
				? parsed.activeDocumentId
				: null;
		return {
			schemaVersion: CURRENT_SNAPSHOT_VERSION,
			snapshot: snapshotResult.snapshot,
			activeDocumentId
		};
	} catch {
		return null;
	}
}

export function writeSession(envelope: PlanetSessionEnvelope): void {
	if (!hasLocalStorage()) return;
	const snapshot = coerceSnapshot(envelope.snapshot);
	if (!snapshot) return;
	const normalized: PlanetSessionEnvelope = {
		schemaVersion: CURRENT_SNAPSHOT_VERSION,
		snapshot,
		activeDocumentId: envelope.activeDocumentId
	};
	localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
}

export function snapshotFromDocument(doc: StoredPlanetDocument): PlanetSnapshot | null {
	return coerceSnapshot(doc.snapshot);
}
