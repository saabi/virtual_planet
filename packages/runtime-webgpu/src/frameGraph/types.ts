export type TargetSize =
	| { kind: 'screen-relative'; scale: number }
	| { kind: 'fixed'; width: number; height: number };

export interface RenderTarget {
	id: string;
	format: GPUTextureFormat;
	size: TargetSize;
	/** Forced persistent (feedback/history); display adds this dynamically. */
	persistent?: boolean;
}

export interface ChannelRead {
	channel: number;
	target: string;
	previousFrame?: boolean;
	sampler?: { filter: 'nearest' | 'linear'; wrap: 'clamp' | 'repeat' };
}

export interface Pass {
	consumerId: string;
	writeTarget: string;
	reads: ChannelRead[];
	iterations?: number;
	pure?: boolean;
}

export interface PassGraph {
	targets: RenderTarget[];
	passes: Pass[];
	display: string;
}
