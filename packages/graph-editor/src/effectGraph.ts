export { cosinePaletteEffectGraph } from './graphBuilders.js';

import { cosinePaletteEffectGraph, primaryPreviewOutput } from './graphBuilders.js';

export function cosinePaletteEffectOutput() {
	return primaryPreviewOutput(cosinePaletteEffectGraph())!;
}
