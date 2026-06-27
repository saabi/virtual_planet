import type { PaneContextAction } from './types.js';

export const PANE_MENU_SEPARATOR_ID = '__separator__';

export function isPaneMenuSeparator(action: PaneContextAction): boolean {
	return action.id === PANE_MENU_SEPARATOR_ID;
}

export function paneMenuSeparator(): PaneContextAction {
	return { id: PANE_MENU_SEPARATOR_ID, label: '', run: () => {} };
}

/** Built-in layout actions + host zone actions, in display order. Pure. */
export function composePaneMenu(
	zone: string,
	zoneMenus: Record<string, PaneContextAction[]> | undefined,
	builtins: PaneContextAction[]
): PaneContextAction[] {
	const zoneActions = zoneMenus?.[zone];
	if (!zoneActions || zoneActions.length === 0) {
		return [...builtins];
	}
	return [...zoneActions, paneMenuSeparator(), ...builtins];
}
