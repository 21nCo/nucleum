<script lang="ts">
  import EmptyStatus from "../illustrations/EmptyStatus.svelte";
  import EmptyStatusInbox from "../illustrations/EmptyStatusInbox.svelte";
  import RocketLaunch from "../illustrations/RocketLaunch.svelte";
  import { windowObject } from "../stores/app.store";
  import { Size } from "../types/size.enum";
  export let mainText: string | undefined = undefined;
  export let subText: string | undefined = undefined;
  export let size: Size = Size.md;
</script>

<div class="flex flex-col w-full h-full justify-center items-center gap-2">
  <div class="flex flex-col gap-1 items-center">
    {#if size === Size.sm || $windowObject.isInPortraitMode}
      <RocketLaunch width={150} />
    {:else}
      <RocketLaunch width={200} />
    {/if}
    <div>{mainText ?? ""}</div>
  </div>
  <div class="text-fgs3 text-center text-b3">
    {subText ?? ""}
  </div>
</div>
