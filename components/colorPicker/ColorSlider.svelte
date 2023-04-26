<script lang="ts">
    export let hue = 0;
    export let saturation: number;
    export let lightness: number;
    const handleHueChange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        hue = parseInt(target.value);
    };
</script>

<div class="hue-slider" style="--sat: {saturation}%; --lig: {lightness}%;">
    <input
        type="range"
        min="0"
        max="360"
        value={hue}
        on:input={handleHueChange}
        style="--hue: {hue};"
    />
</div>

<style>
    .hue-slider {
        background: linear-gradient(
            to right,
            hsl(0, var(--sat), var(--lig)),
            hsl(60, var(--sat), var(--lig)),
            hsl(120, var(--sat), var(--lig)),
            hsl(180, var(--sat), var(--lig)),
            hsl(240, var(--sat), var(--lig)),
            hsl(300, var(--sat), var(--lig)),
            hsl(360, var(--sat), var(--lig))
        );
        height: 20px;
        width: 100%;
        border-radius: 1000px;
    }

    .hue-slider input[type="range"] {
        -webkit-appearance: none;
        background: transparent;
        width: 100%;
        height: 10px;
        border-radius: 5px;
    }

    .hue-slider input[type="range"]:focus {
        outline: none;
    }

    .hue-slider input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 40px;
        width: 40px;
        border-radius: 50%;
        background: hsl(var(--hue), var(--sat), var(--lig));
        cursor: pointer;
        margin-top: -5px;
        border: solid 2px rgba(var(--colors-fgs1));
    }
</style>
