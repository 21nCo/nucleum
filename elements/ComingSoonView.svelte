<script lang="ts">
  import RocketLaunch from "../illustrations/RocketLaunch.svelte";
  import { view } from "../stores/app.store";
  import { Size } from "../types/size.enum";
  export let mainText: string | undefined = undefined;
  export let subText: string | undefined = undefined;
  export let size: Size = Size.md;
  if (!mainText && !subText) {
    mainText = "Coming Soon";
    subText = "We are working on this feature. Stay tuned!";
  }
</script>

<div class="flex flex-col w-full h-full justify-center items-center gap-2">
  <div class="flex flex-col gap-1 items-center">
    {#if size === Size.sm || $view.isPortrait}
      <RocketLaunch width={120} />
    {:else}
      <RocketLaunch width={200} />
    {/if}
    <div>{mainText ?? ""}</div>
  </div>
  <div class="text-fgs3 text-center text-b3">
    {subText ?? ""}
  </div>
</div>
