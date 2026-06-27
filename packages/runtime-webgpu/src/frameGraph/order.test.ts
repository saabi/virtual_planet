import { describe, expect, it } from 'vitest';

import { buildPassOrder, resolveTargetSizes, validatePassGraph } from './order.js';
import type { PassGraph } from './types.js';

function chainGraph(): PassGraph {
	return {
		targets: [
			{ id: 'A', format: 'rgba8unorm', size: { kind: 'screen-relative', scale: 1 } },
			{ id: 'B', format: 'rgba8unorm', size: { kind: 'screen-relative', scale: 1 } },
		],
		passes: [
			{ consumerId: 'A', writeTarget: 'A', reads: [] },
			{ consumerId: 'B', writeTarget: 'B', reads: [{ channel: 0, target: 'A' }] },
		],
		display: 'B',
	};
}

describe('@virtual-planet/runtime-webgpu frameGraph order', () => {
	it('orders a three-target chain and keeps the display target alive', () => {
		const result = buildPassOrder(chainGraph());

		expect(result.order).toEqual(['A', 'B']);
		expect(result.feedbackTargets).toContain('B');
		expect(result.lifetimes.A).toEqual({ firstWrite: 0, lastRead: 1 });
		expect(result.lifetimes.B).toEqual({ firstWrite: 1, lastRead: 1 });
	});

	it('marks previousFrame self-reads as feedback without erroring', () => {
		const graph: PassGraph = {
			targets: [{ id: 'State', format: 'rgba8unorm', size: { kind: 'fixed', width: 64, height: 64 } }],
			passes: [
				{
					consumerId: 'Life',
					writeTarget: 'State',
					reads: [{ channel: 0, target: 'State', previousFrame: true }],
				},
			],
			display: 'State',
		};

		const result = buildPassOrder(graph);
		expect(result.order).toEqual(['Life']);
		expect(result.feedbackTargets).toEqual(['State']);
	});

	it('reports read-write-same-pass when a pass reads its write target same frame', () => {
		const issues = validatePassGraph({
			targets: [{ id: 'T', format: 'rgba8unorm', size: { kind: 'fixed', width: 1, height: 1 } }],
			passes: [{ consumerId: 'Bad', writeTarget: 'T', reads: [{ channel: 0, target: 'T' }] }],
			display: 'T',
		});

		expect(issues).toContainEqual({
			kind: 'read-write-same-pass',
			pass: 'Bad',
			target: 'T',
		});
		expect(() => buildPassOrder({
			targets: [{ id: 'T', format: 'rgba8unorm', size: { kind: 'fixed', width: 1, height: 1 } }],
			passes: [{ consumerId: 'Bad', writeTarget: 'T', reads: [{ channel: 0, target: 'T' }] }],
			display: 'T',
		})).toThrow(/read-write-same-pass|write target/i);
	});

	it('reports intra-frame cycles from same-frame reads', () => {
		const graph: PassGraph = {
			targets: [
				{ id: 'TA', format: 'rgba8unorm', size: { kind: 'fixed', width: 1, height: 1 } },
				{ id: 'TB', format: 'rgba8unorm', size: { kind: 'fixed', width: 1, height: 1 } },
			],
			passes: [
				{ consumerId: 'PassA', writeTarget: 'TA', reads: [{ channel: 0, target: 'TB' }] },
				{ consumerId: 'PassB', writeTarget: 'TB', reads: [{ channel: 0, target: 'TA' }] },
			],
			display: 'TB',
		};

		const issues = validatePassGraph(graph);
		expect(issues.some((issue) => issue.kind === 'intra-frame-cycle')).toBe(true);
		expect(() => buildPassOrder(graph)).toThrow(/cycle/i);
	});

	it('reports dangling target references', () => {
		const issues = validatePassGraph({
			targets: [{ id: 'A', format: 'rgba8unorm', size: { kind: 'fixed', width: 1, height: 1 } }],
			passes: [{ consumerId: 'Reader', writeTarget: 'A', reads: [{ channel: 0, target: 'Missing' }] }],
			display: 'A',
		});

		expect(issues).toContainEqual({
			kind: 'dangling-target',
			pass: 'Reader',
			target: 'Missing',
		});
	});

	it('resolves screen-relative and fixed target sizes', () => {
		const sizes = resolveTargetSizes(
			{
				targets: [
					{ id: 'Full', format: 'rgba8unorm', size: { kind: 'screen-relative', scale: 1 } },
					{ id: 'Half', format: 'rgba8unorm', size: { kind: 'screen-relative', scale: 0.5 } },
					{ id: 'Fixed', format: 'rgba8unorm', size: { kind: 'fixed', width: 320, height: 240 } },
				],
				passes: [],
				display: 'Full',
			},
			{ width: 800, height: 600 },
		);

		expect(sizes.Full).toEqual({ width: 800, height: 600 });
		expect(sizes.Half).toEqual({ width: 400, height: 300 });
		expect(sizes.Fixed).toEqual({ width: 320, height: 240 });
	});
});
