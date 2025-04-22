<script lang="ts">
  import { resizeListener } from "$lib/client/actions/resize.action";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import type { ISessionThumb } from "$lib/client/products/pointron/logs/log.type";
  import LogThumbnailGoalsInfo from "$lib/client/products/pointron/logs/LogThumbnailGoalsInfo.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { formatSeconds, formatTime } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import FocusEntryGoalsInfoShort from "./FocusEntryGoalsInfoShort.svelte";
  import FocusEntryFocusSplitInfo from "./FocusEntryFocusSplitInfo.svelte";
  import { Size } from "$lib/client/types/size.enum";
  export let item: ISessionThumb & {
    splits: {
      focus: number;
      brek: number;
    };
  };
  export let height: number;
  export let isOverlapping: boolean;
  let width: number;
  $: isConstrainedHeight = height > 0 && height < 100;
  $: isConstrainedWidth = width > 0 && width < 200;
</script>

<button
  class="flex flex-col w-full px-1"
  on:click={() => {
    appStore.openResource(item.id, ResourceAccessMode.POP);
  }}
  use:resizeListener={(el) => {
    width = el.width;
  }}
>
  <div
    class={cn("flex justify-between flex-wrap gap--2 w-full", {
      "flex-col": isConstrainedWidth
    })}
  >
    <div class="flex gap-2 items-center text-b3 text-fgs3">
      {formatTime($userPreferences, new Date(item.startUnix))}
      -
      {formatTime($userPreferences, new Date(item.endUnix))}
    </div>
    {#if isConstrainedHeight}
      <div class="flex justify-between gap-2 flex-wrap items-center">
        <FocusEntryGoalsInfoShort {item} />
        <FocusEntryFocusSplitInfo splits={item.splits} />
      </div>
    {:else}
      <FocusEntryFocusSplitInfo
        splits={item.splits}
        size={!isConstrainedWidth && !isConstrainedHeight && !isOverlapping
          ? Size.md
          : Size.sm}
      />
    {/if}
  </div>
  {#if !isConstrainedHeight}
    <LogThumbnailGoalsInfo session={item} />
  {/if}
</button>
