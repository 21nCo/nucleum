<script lang="ts">
  import { resizeListener } from "@21n/actions/resize.action";
  import { AccessMode } from "@21n/data/datafn/resource.type";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import type { ISessionThumb } from "@21n/products/pointron/logs/log.type";
  import LogThumbnailObjectivesInfo from "@21n/products/pointron/logs/LogThumbnailGoalsInfo.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { formatSeconds, formatTime } from "@21n/utils/time.utils";
  import { cn } from "@21n/utils/ui.utils";
  import FocusEntryGoalsInfoShort from "@21n/components/calendar/column/timeline/focusEntry/FocusEntryGoalsInfoShort.svelte";
  import FocusEntryFocusSplitInfo from "@21n/components/calendar/column/timeline/focusEntry/FocusEntryFocusSplitInfo.svelte";
  import { Size } from "@21n/types/size.enum";

  let {
    item,
    height,
    isOverlapping
  }: {
    item: ISessionThumb & {
      splits: {
        focus: number;
        brek: number;
      };
    };
    height: number;
    isOverlapping: boolean;
  } = $props();

  let width = $state(0);
  const isConstrainedHeight = $derived(height > 0 && height < 100);
  const isConstrainedWidth = $derived(width > 0 && width < 200);
</script>

<button
  class="flex flex-col w-full px-1"
  onclick={() => {
    appStore.openResource(item.id, AccessMode.POP);
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
    <LogThumbnailObjectivesInfo session={item} />
  {/if}
</button>
