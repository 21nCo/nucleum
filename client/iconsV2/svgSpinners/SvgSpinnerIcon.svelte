<script lang="ts">
  import ThreeDotsFade from "@21n/icons-v2/svgSpinners/ThreeDotsFade.svelte";
  import ThreeDotsScale from "@21n/icons-v2/svgSpinners/ThreeDotsScale.svelte";
  import NinetyRingWithBg from "@21n/icons-v2/svgSpinners/NinetyRingWithBg.svelte";
  import One80RingWithBg from "@21n/icons-v2/svgSpinners/One80RingWithBg.svelte";
  import BarsFade from "@21n/icons-v2/svgSpinners/BarsFade.svelte";
  import BarsScaleFade from "@21n/icons-v2/svgSpinners/BarsScaleFade.svelte";
  import BarsRotateFade from "@21n/icons-v2/svgSpinners/BarsRotateFade.svelte";
  import BarsScale from "@21n/icons-v2/svgSpinners/BarsScale.svelte";
  import BarsScaleMiddle from "@21n/icons-v2/svgSpinners/BarsScaleMiddle.svelte";
  import EclipseHalf from "@21n/icons-v2/svgSpinners/EclipseHalf.svelte";
  export let icon: string;
</script>

{#if icon.includes("3-dots-fade")}
  <ThreeDotsFade />
{:else if icon.includes("3-dots-scale")}
  <ThreeDotsScale />
{:else if icon.includes("90-ring-with-bg")}
  <NinetyRingWithBg />
{:else if icon.includes("180-ring-with-bg")}
  <One80RingWithBg />
{:else if icon.includes("bars-fade")}
  <BarsFade />
{:else if icon.includes("bars-scale-fade")}
  <BarsScaleFade />
{:else if icon.includes("bars-rotate-fade")}
  <BarsRotateFade />
{:else if icon.includes("bars-scale-middle")}
  <BarsScaleMiddle />
{:else if icon.includes("bars-scale")}
  <BarsScale />
{:else if icon.includes("eclipse-half")}
  <EclipseHalf />
{/if}
