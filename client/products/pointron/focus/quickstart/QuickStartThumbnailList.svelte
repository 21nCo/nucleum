<script lang="ts">
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { Layout } from "$lib/client/types/layout.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import QuickStartThumbnail from "./QuickStartThumbnail.svelte";

  export let items: any[];
  export let layout: Layout;
  export let isInEditMode: boolean;
  export let title: string | undefined = undefined;
  export let emptyStatusText: string | undefined = undefined;

  function onUnpin(e: CustomEvent<IRecordId>) {
    items = items.filter((x) => !isSameResource(x.id, e.detail));
  }
</script>

<div class="flex flex-col gap-2 w-full px-4">
  {#if title}
    <Text content={title} style={TextStyle.SECTION_HEADING} />
  {/if}
  {#if items.length > 0}
    <div
      class={cn("w-full", {
        "flex flex-col gap-3": layout === Layout.LIST,
        "grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))]":
          layout != Layout.LIST,
        "gap-2": layout != Layout.LIST && !isInEditMode,
        "gap-5 pt-4": isInEditMode
      })}
    >
      {#each items as item, index (item.id)}
        <QuickStartThumbnail
          {item}
          {layout}
          {isInEditMode}
          on:unpin={onUnpin}
        />
      {/each}
    </div>
  {:else}
    <div class="flex w-full py-6">
      <EmptyStatusView size={Size.sm} subText={emptyStatusText} />
    </div>
  {/if}
</div>
