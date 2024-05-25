<script lang="ts">
  export let minutes: number;
  export let width: number;
</script>

<!-- <svg {width} height={width}>
  <text
    x="34"
    y="34"
    text-anchor="middle"
    dominant-baseline="central"
    class="text-center text-bgs1 text-lg"
  >
    +{minutes}
  </text>
</svg> -->
<div
  class="text-center flex items-center justify-center text-b1 text-bgs1"
  style="width:{width}px; height: {width}px"
>
  +{minutes}
</div>
