<script>
    export let label;
    export let value;

    export let min, max, step;

    let formatted_value;

    function format(n, step) {
        const precision = Math.log10(step);
        if (precision < 0) {
            const factor = Math.pow(10,-precision);
            return Math.round(n*factor)/factor
        }
        return n;
    }

    $: formatted_value = format(value, step);
</script>

<style>
label {
    display: inline-block;
    width: 5em;
    text-align: right;
    margin: 0 10px;
}
data {
    display: inline-block;
    width: 3em;
    text-align: right;
    color: #0f0;
    background: rgba(64,64,64,0.5);
    padding: 0 0.5em;
    margin: 1px;
}
input {
  -webkit-appearance: none;
  margin: 0 10px;
  width: 128px;
  background: transparent;
}
input:focus {
  outline: none;
}
input::-webkit-slider-runnable-track {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  cursor: pointer;
  animate: 0.2s;
  background: #555;
  border-radius: 4px;
  border: thin inset #555;
}
input::-webkit-slider-thumb
{
  -webkit-appearance: none;
  border: thin outset #bbb;
  margin-top: -3.6px;
  width: 8px;
  height: 10px;
  border-radius: 4px;
  background: #bbb;
  cursor: ew-resize;
}
input:focus::-webkit-slider-runnable-track
{
  background: #775;
}
input::-moz-range-track {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  cursor: pointer;
  animate: 0.2s;
  background: #555;
  border-radius: 4px;
  border: thin inset #555;
}
input::-moz-range-thumb
{
  -webkit-appearance: none;
  border: thin outset #bbb;
  margin-top: -3.6px;
  width: 8px;
  height: 10px;
  border-radius: 4px;
  background: #bbb;
  cursor: ew-resize;
}
input:focus::-webkit-slider-runnable-track
{
  background: #775;
}

input::-ms-fill-lower,
input::-ms-fill-upper {
  background: #ac51b5;
  border: 0px solid #000101;
  border-radius: 50px;
  box-shadow: 0px 0px 0px #000000, 0px 0px 0px #0d0d0d;
}
</style>

<label>{label}</label>
<input type="range" min={min} max={max} step={step} bind:value={value} /> 
<data>{formatted_value}</data>
