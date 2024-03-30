<script lang="ts">
  export let label: string;
  export let color: string | undefined;
  export let xCoord: number;
  export let yCoord: number;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<text
  x={xCoord}
  y={yCoord}
  text-anchor="middle"
  dominant-baseline="middle"
  class="text-b1 font-bold hover:cursor-pointer {!color ? 'fill-fgs2' : ''}"
  fill={color}
  on:click
>
  {label}
</text>
