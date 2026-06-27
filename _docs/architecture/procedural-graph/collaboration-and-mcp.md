# Documents, sessions & MCP

**Status:** architecture · **Scope:** web backend (document/session store),
`packages/mcp-server`. Part of the [Procedural Graph System](./README.md).

## Document & session model

State is **server-backed**, distinguishing persistence from live editing. There
is **one app-agnostic document format and one store** — the serialized Graph IR
(JSON); Svelte/React/Vue markup are export/optional-import projections, not the
saved format (see
[editor.md](./editor.md#document-format-ir-native-svelte-as-export)). "Standalone
editor" and "Virtual Planet" are two *clients* of it, not two file formats. A graph
saved in
the standalone editor *is* the same document opened and edited in the planet app,
with no import/export step; this includes shared surface/tessellation documents
(see [runtime-and-tessellation.md](./runtime-and-tessellation.md)).

- **GraphDocument** — a persistent, versioned saved asset in a project/workspace.
- **GraphSession** — an active editing instance (may be temporary; may have many
  connected clients: browser tabs and MCP clients).

Documents come in **kinds**, all sharing the versioned store: *graph documents*
(instances + wiring — the visual graph and its Svelte markup are two views of one),
*primitive-type documents* (self-describing WGSL + YAML; editing one ripples to
every graph that uses it — see
[editor.md → multi-level editing](./editor.md#multi-level-synchronized-editing)),
*surface/tessellation documents*
([runtime-and-tessellation.md](./runtime-and-tessellation.md)), and *resource
documents* (image/mesh/audio —
[inputs-cpu-and-resources.md](./inputs-cpu-and-resources.md)).

The browser holds a *working view* of a server-backed session, not the
authoritative state, so agents can inspect/modify open work even from another
process.

```
Browser Tab A ┐
Browser Tab B ├── GraphSession ── GraphDocument
MCP Client    ┘
```

```ts
type GraphSession = {
  sessionId: string; documentId?: string;
  baseVersion: string; activeVersion: string;
  participants: Participant[]; lastActivityAt: string;
  autosave: boolean; temporary: boolean;
};
type Participant = {
  clientId: string; kind: 'browser-tab'|'mcp-client'|'web-client'|'agent';
  userId: string; displayName?: string; lastSeenAt: string;
};
```

**Patch-based editing.** All mutations are versioned patches:
`graph.patch(sessionId, baseVersion, patch)`. The server validates, applies, bumps
the version, and broadcasts to all tabs + MCP clients (WebSocket / SSE). Stale
base → `409 Conflict` → client rebases and reapplies. Multiple tabs attach to the
same session rather than diverging.

**Temporary documents.** Untitled graphs are still persisted server-side as
temporary session documents — they autosave, expire after inactivity, can be
promoted to saved documents, and are editable via MCP. **Dirty state**
`dirty = activeVersion != savedVersion` is exposed so agents can answer "which open
graph has unsaved changes?".

## MCP architecture

The procedural language is AI-native: assistants operate on the Typed Graph IR
through a **hosted, shared MCP server** that runs *beside the web backend* (not one
per browser), depending only on `graph` + `schema` + `compiler` — never on Svelte
or the renderer. A separate **local mode** (filesystem, localhost, pairing token)
serves IDE/desktop-agent workflows.

```
AI Assistant (Claude / ChatGPT / IDE agents)
        │ MCP
        ▼
   MCP Server ──► Typed Graph IR ──► Compiler / Editor ──► WebGPU Runtime
```

**Authentication & scopes.** The server authenticates **both** the user and the
client identity, and acts only within explicit user-granted scopes — never global
access by default. Hosted multiuser should validate the same JWT (Clerk/Supabase/
OAuth) as the app.

```ts
type McpContext = { userId: string; workspaceId: string; projectId?: string; clientId: string; scopes: string[] };
// scopes: graph:read · graph:write · graph:compile · wgsl:inspect · session:read · session:write
```

**Tools.** Saved documents — `documents.list_saved | search | get | create |
update | delete | get_versions`. Active sessions — `sessions.list_active | get |
get_graph | get_participants | get_dirty_state | apply_patch | save |
promote_temporary | close`. Plus primitive listing, validation, compilation,
diagnostics, and generated-WGSL/dependency inspection. Because primitives are
schema-driven, agents automatically know parameters, types, ranges, units,
defaults, docs, and compatible ports — no per-primitive tool descriptions needed.

**Selection rules.** Named graph → operate on a `GraphDocument`; "the graph I have
open" / "the current editor" → operate on a `GraphSession`; multiple active →
expose `sessions.list_active` or ask; temporary → allow edit/save/promote; unsaved
changes → prefer session state. Every edit is **audited** (user, client, session,
document, timestamp, patch summary, old/new version hashes).
