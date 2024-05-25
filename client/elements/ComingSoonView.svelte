<script lang="ts">
  import RocketLaunch from "../illustrations/RocketLaunch.svelte";
  import { Size } from "../types/size.enum";
  import view from "$lib/client/stores/view.store";
  import Link from "./text/Link.svelte";
  import { LinkVariant } from "../types/button.type";
  import Button from "./button/Button.svelte";
  import { AppEvent } from "../types/event.enum";
  import { appStore } from "../stores/app.store";
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
  <div class="text-b3 text-fgs2">
    <Link
      on:click={() => {
        appStore.runAction(AppEvent.ROADMAP);
      }}
      label="See roadmap"
      variant={LinkVariant.DOTTED}
    />
  </div>
</div>
