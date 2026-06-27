import { describe, expect, it } from 'vitest';
import { MCP_SERVER_PACKAGE } from './index.js';

describe('@virtual-planet/mcp-server scaffold', () => {
	it('exports its package identity', () => {
		expect(MCP_SERVER_PACKAGE).toBe('@virtual-planet/mcp-server');
	});
});
