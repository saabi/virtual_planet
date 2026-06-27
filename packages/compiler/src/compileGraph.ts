import type { GraphDocument, ProceduralConsumer } from '@virtual-planet/graph';
import type { WgslModuleResolver } from './codegen.js';
import { generateWgsl } from './codegen.js';
import type { ShaderLinker } from './linker.js';
import { sliceGraph } from './slice.js';

/** One compiled consumer: the WGSL for the slice it requested. */
export interface ConsumerShader {
	consumerId: string;
	stage: string;
	outputs: string[];
	/** Linked WGSL for this consumer's slice (dependency-ordered function library). */
	code: string;
	/** Modules included, in emit order. */
	moduleIds: string[];
}

export interface GraphCompileResult {
	shaders: ConsumerShader[];
	/** Module ids used by more than one consumer (shared evaluation). */
	sharedModuleIds: string[];
}

export interface CompileGraphOptions {
	/** Compile these consumers instead of `doc.consumers`. */
	consumers?: ProceduralConsumer[];
	/** Optional linker (currently the generated library is returned as-is). */
	linker?: ShaderLinker;
}

/** Compile every consumer of `doc` (or an explicit subset) into its own shader. */
export async function compileGraph(
	doc: GraphDocument,
	resolver: WgslModuleResolver,
	opts: CompileGraphOptions = {},
): Promise<GraphCompileResult> {
	const consumers = opts.consumers ?? doc.consumers;
	const shaders: ConsumerShader[] = [];
	const moduleUseCount = new Map<string, number>();
	const sharedSeen = new Set<string>();
	const sharedModuleIds: string[] = [];

	for (const consumer of consumers) {
		const consumerId = consumer.id ?? consumer.type;
		const slice = sliceGraph(doc, { outputs: consumer.outputs });
		const gen = await generateWgsl(slice, resolver);

		shaders.push({
			consumerId,
			stage: consumer.stage ?? 'unknown',
			outputs: consumer.outputs,
			code: gen.code,
			moduleIds: gen.moduleIds,
		});

		// Count distinct modules per consumer; a module in >=2 consumers is shared.
		for (const id of new Set(gen.moduleIds)) {
			const next = (moduleUseCount.get(id) ?? 0) + 1;
			moduleUseCount.set(id, next);
			if (next === 2 && !sharedSeen.has(id)) {
				sharedSeen.add(id);
				sharedModuleIds.push(id);
			}
		}
	}

	return { shaders, sharedModuleIds };
}
