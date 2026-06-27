// @virtual-planet/mcp-server — MCP server exposing the Typed Graph IR to AI assistants (documents, sessions, compile, diagnostics).
//
// M0 scaffold (see _docs/architecture/procedural-graph/implementation-plan.md).
// Depends only on graph + schema + compiler; no Svelte/renderer dependency.

/** Package identity marker. */
export const MCP_SERVER_PACKAGE = '@virtual-planet/mcp-server' as const;
