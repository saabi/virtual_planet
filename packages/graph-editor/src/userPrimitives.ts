import { registerPrimitive, type NodePrimitive } from '@world-lab/graph';
import { loadWgslPrimitive } from '@world-lab/compiler';

export const USER_PRIMITIVES_STORAGE_KEY = 'virtual-planet:graph-editor:user-primitives:v1';

const userSources = new Map<string, string>();
let hydrated = false;

function storage(): Storage | null {
	if (typeof localStorage === 'undefined') {
		return null;
	}
	return localStorage;
}

export function isUserPrimitiveId(id: string): boolean {
	return id.startsWith('user.');
}

export function listUserPrimitiveSources(): ReadonlyMap<string, string> {
	return userSources;
}

function readStoredSources(): Record<string, string> {
	const store = storage();
	if (!store) return {};
	const raw = store.getItem(USER_PRIMITIVES_STORAGE_KEY);
	if (raw === null) return {};
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return {};
		}
		const result: Record<string, string> = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (typeof value === 'string' && isUserPrimitiveId(key)) {
				result[key] = value;
			}
		}
		return result;
	} catch {
		return {};
	}
}

function writeStoredSources(): void {
	const store = storage();
	if (!store) return;
	const payload: Record<string, string> = {};
	for (const [id, source] of userSources) {
		payload[id] = source;
	}
	store.setItem(USER_PRIMITIVES_STORAGE_KEY, JSON.stringify(payload));
}

export function persistUserPrimitiveSource(userId: string, source: string): void {
	if (!isUserPrimitiveId(userId)) {
		throw new Error('User primitive ids must start with user.');
	}
	userSources.set(userId, source);
	writeStoredSources();
}

export function registerUserPrimitiveFromSource(
	userId: string,
	source: string,
	evalCPU?: NodePrimitive['evalCPU']
): NodePrimitive {
	if (!isUserPrimitiveId(userId)) {
		throw new Error('User primitive ids must start with user.');
	}
	const loaded = loadWgslPrimitive({ moduleId: userId, source });
	if (loaded.primitive.id !== userId) {
		throw new Error(`Primitive id mismatch: expected ${userId}, got ${loaded.primitive.id}`);
	}
	const primitive: NodePrimitive = {
		...loaded.primitive,
		...(evalCPU !== undefined ? { evalCPU } : {})
	};
	registerPrimitive(primitive);
	userSources.set(userId, source);
	return primitive;
}

export function hydrateUserPrimitives(): void {
	if (hydrated) return;
	hydrated = true;
	userSources.clear();
	for (const [userId, source] of Object.entries(readStoredSources())) {
		try {
			registerUserPrimitiveFromSource(userId, source);
		} catch {
			// Skip invalid persisted entries.
		}
	}
}

/** Reset in-memory user primitives — for tests. Does not touch localStorage. */
export function resetUserPrimitives(): void {
	userSources.clear();
	hydrated = false;
}

export function markUserPrimitivesHydratedForTests(): void {
	hydrated = true;
}
