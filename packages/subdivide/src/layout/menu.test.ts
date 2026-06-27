import { describe, expect, it } from 'vitest';
import { composePaneMenu, isPaneMenuSeparator, paneMenuSeparator } from './menu.js';
import type { PaneContextAction } from './types.js';

const a: PaneContextAction = { id: 'a', label: 'A', run: () => {} };
const b: PaneContextAction = { id: 'b', label: 'B', run: () => {} };

describe('composePaneMenu', () => {
	it('places zone actions before built-ins with a separator', () => {
		const items = composePaneMenu('canvas', { canvas: [a] }, [b]);
		expect(items).toHaveLength(3);
		expect(items[0]).toBe(a);
		expect(isPaneMenuSeparator(items[1]!)).toBe(true);
		expect(items[2]).toBe(b);
	});

	it('returns only built-ins for an unknown zone', () => {
		expect(composePaneMenu('unknown', { canvas: [a] }, [b])).toEqual([b]);
	});

	it('returns only built-ins when zone menus are empty', () => {
		expect(composePaneMenu('canvas', {}, [b])).toEqual([b]);
		expect(composePaneMenu('canvas', { canvas: [] }, [b])).toEqual([b]);
	});

	it('paneMenuSeparator is recognized', () => {
		expect(isPaneMenuSeparator(paneMenuSeparator())).toBe(true);
	});
});
