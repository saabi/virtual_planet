<script>
    export let label;
    export let value;

    export let min, max, step
</script>

<style>
label {
    display: inline-block;
    width: 5em;
    text-align: right;
}
data {
    display: inline-block;
    width: 3em;
    text-align: right;
    color: #0f0;
    background: rgba(64,64,64,0.5);
}
</style>

<label>{label}</label>
<input type="range" min={min} max={max} step={step} bind:value={value} /> 
<data>{value}</data>
