<script lang="ts">
	import { useSvelteFlow } from '@xyflow/svelte';

	interface Props {
		onregister?: (api: { fitView: () => void }) => void;
	}

	let { onregister }: Props = $props();

	const { fitView } = useSvelteFlow();

	$effect(() => {
		onregister?.({ fitView: () => fitView() });
	});
</script>
