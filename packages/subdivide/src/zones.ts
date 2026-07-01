import type { Snippet } from 'svelte';

/** Zone content snippets receive the hosting pane id as their sole argument. */
export type ZoneMap = Record<string, Snippet<[string]>>;
