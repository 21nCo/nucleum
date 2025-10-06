<script lang="ts">
  import ThreeDotsFade from "./ThreeDotsFade.svelte";
  import ThreeDotsScale from "./ThreeDotsScale.svelte";
  import NinetyRingWithBg from "./NinetyRingWithBg.svelte";
  import One80RingWithBg from "./One80RingWithBg.svelte";
  import BarsFade from "./BarsFade.svelte";
  import BarsScaleFade from "./BarsScaleFade.svelte";
  import BarsRotateFade from "./BarsRotateFade.svelte";
  import BarsScale from "./BarsScale.svelte";
  import BarsScaleMiddle from "./BarsScaleMiddle.svelte";
  import EclipseHalf from "./EclipseHalf.svelte";
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
