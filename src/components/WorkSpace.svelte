<script>
    export let panels;
    export let active;
    export let childProps = [];
</script>

<div>
    <svelte:component this={panels[active]} {...childProps}/>
</div>

<style>
div {
    width: 100%;
    height: 100%;
}
</style>