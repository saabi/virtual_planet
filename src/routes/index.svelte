<script>
	import Subdivide from '@sveltejs/svelte-subdivide';
	import WorkSpace from '../components/WorkSpace.svelte';
	import ColorSpace from '../components/ColorSpace.svelte';
	import PlanetDisplay from '../components/PlanetDisplay.svelte';
	import Spectrum from '../components/Spectrum.svelte';
	import Sandbox from '../components/SandboxShader.svelte';

	const panels = {
		colorspace: ColorSpace,
		planetDisplay: PlanetDisplay,
		spectrum: Spectrum,
		"glsl-sandbox": Sandbox
	}
	const defaultComponentProps = {panels, active: 'planetDisplay'};

	let layout = {
		root: {
			id: '0',
			type: 'group',
			row: true,
			pos: 0,
			size: 1,
			prev: null,
			next: null,
			children: [
				{
					type: 'pane',
					id: '1',
					pos: 0,
					size: 0.5,
					prev: null,
					next: null,
					childProps: {panels, active: 'planetDisplay'}
				},
				{
					type: 'pane',
					id: '2',
					pos: 0.5,
					size: 0.5,
					prev: null,
					next: null,
					childProps: {panels, active: 'planetDisplay'}
				}
			]
		}
	};

</script>

<svelte:head>
	<title>ColorLab ALPHA</title>
</svelte:head>

<Subdivide component={WorkSpace} 
	componentProps={defaultComponentProps}
	thickness='3px' 
	{layout} />


<style>
</style>
