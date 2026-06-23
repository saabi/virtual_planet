export function createPaneId(): string {
	return Math.random().toString(36).slice(2);
}

export function createPaneIdUnique(usedIds: Set<string>): string {
	while (true) {
		const id = createPaneId();
		if (!usedIds.has(id)) {
			usedIds.add(id);
			return id;
		}
	}
}
