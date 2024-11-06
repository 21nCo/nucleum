<script lang="ts">
  import RocketLaunch from "../illustrations/RocketLaunch.svelte";
  import { Size } from "../types/size.enum";
  import view from "$lib/client/stores/view.store";
  import Link from "./text/Link.svelte";
  import { Action } from "../types/action.enum";
  import ComingSoon from "../illustrations/pixelsmarket/ComingSoon.svelte";
  export let mainText: string | undefined = undefined;
  export let subText: string | undefined = undefined;
  export let size: Size = Size.md;
  export let isHideRoadmap: boolean = false;
  export let style: 1 | 2 = 1;
  if (!mainText && !subText) {
    mainText = "Coming Soon";
    subText = "We are working on this feature. Stay tuned!";
  }
</script>

<div class="flex flex-col w-full h-full justify-center items-center gap-2">
  <div class="flex flex-col gap-1 items-center">
    {#if size === Size.sm || $view.isPortrait}
      <RocketLaunch width={120} />
    {:else if style === 1}
      <RocketLaunch width={200} />
    {:else if style === 2}
      <ComingSoon width={200} />
    {/if}
    <div>{mainText ?? ""}</div>
  </div>
  <div class="text-fgs3 text-center text-b3">
    {subText ?? ""}
  </div>
  {#if !isHideRoadmap}
    <div class="text-b3 text-fgs2">
      <Link href={Action.ROADMAP} label="See roadmap" />
    </div>
  {/if}
</div>
