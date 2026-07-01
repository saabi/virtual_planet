import '@virtual-planet/graph';
import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import NodeSwapMenu from './NodeSwapMenu.svelte';

describe('NodeSwapMenu click-outside', () => {
	it('calls onclose on pointerdown outside the menu root', () => {
		const onclose = vi.fn();
		render(NodeSwapMenu, {
			props: { currentPrimitiveId: 'noise.worley2d', onclose }
		});

		fireEvent.pointerDown(document.body);
		expect(onclose).toHaveBeenCalledTimes(1);
	});

	it('does not call onclose on pointerdown inside the menu root', () => {
		const onclose = vi.fn();
		const { container } = render(NodeSwapMenu, {
			props: { currentPrimitiveId: 'noise.worley2d', onclose }
		});

		const input = container.querySelector('input');
		expect(input).not.toBeNull();
		fireEvent.pointerDown(input!);
		expect(onclose).not.toHaveBeenCalled();
	});
});
