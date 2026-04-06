<script lang="ts">
  let {
    minutes
  }: {
    minutes: number;
  } = $props();

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
<div class="text-center flex items-center justify-center text-b1 text-bgs1">
  +{minutes}
</div>
