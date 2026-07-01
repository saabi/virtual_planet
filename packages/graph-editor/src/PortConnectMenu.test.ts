import '@world-lab/graph';
import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import PortConnectMenu from './PortConnectMenu.svelte';
import { compatibleProducers } from '@world-lab/graph';

describe('PortConnectMenu click-outside', () => {
	it('calls onclose on pointerdown outside the menu root', () => {
		const onclose = vi.fn();
		render(PortConnectMenu, {
			props: { matches: compatibleProducers('f32').slice(0, 5), onclose }
		});

		fireEvent.pointerDown(document.body);
		expect(onclose).toHaveBeenCalledTimes(1);
	});

	it('does not call onclose on pointerdown inside the menu root', () => {
		const onclose = vi.fn();
		const { container } = render(PortConnectMenu, {
			props: { matches: compatibleProducers('f32').slice(0, 5), onclose }
		});

		const input = container.querySelector('input');
		expect(input).not.toBeNull();
		fireEvent.pointerDown(input!);
		expect(onclose).not.toHaveBeenCalled();
	});
});
