<script lang="ts">
  export let minutes: number;
  export let width: number;
</script>

<svg {width} height={width}>
  <text
    x="34"
    y="34"
    text-anchor="middle"
    dominant-baseline="central"
    class="text-center text-bgs1 text-lg"
  >
    +{minutes}
  </text>
</svg>
