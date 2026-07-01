import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import ZonePaneIdHarness from './ZonePaneIdHarness.svelte';

describe('@virtual-planet/subdivide zone snippets', () => {
	it('passes the pane id into the zone snippet', () => {
		render(ZonePaneIdHarness);
		const zone = screen.getByTestId('zone-content');
		expect(zone.getAttribute('data-pane-id')).toBeTruthy();
	});
});
