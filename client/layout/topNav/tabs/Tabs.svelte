<script lang="ts">
  import TopBarResourceItem from "@21n/layout/topNav/tabs/TopBarResourceItem.svelte";
  import { tabs } from "@21n/layout/topNav/tabs/tabs.store";
  import { moveItemInArray } from "@21n/shared-utils/obj.utils";
  import type { IRecordId } from "@21n/types/data.type";
  import { createEventDispatcher } from "svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { ButtonStyle } from "@21n/types/button.type";
  const dispatch = createEventDispatcher();
  export let pinnedItems: IRecordId[];
  export let isShowHome = false;
  export let activeTab: string | null = null;
</script>

<div
  class={cn("flex gap--2 pr-8 h-full items-center overflow-x-auto", {
    grow: pinnedItems.length > 0
  })}
>
  {#if isShowHome}
    <div
      class={cn("flex justify-center items-center px-2 border-r border-brs3", {
        "bg-bgs1": !activeTab
      })}
    >
      <Button
        icon="ph:house"
        style={ButtonStyle.PLAIN}
        on:click={(e) => {
          dispatch("home", true);
        }}
      />
    </div>
  {/if}
  {#each pinnedItems as item, index (item)}
    <TopBarResourceItem
      {item}
      on:click={(e) => {
        dispatch("home", false);
        tabs.activate(item);
      }}
      on:rearrange={(e) => {
        pinnedItems = moveItemInArray(
          pinnedItems,
          index,
          e.detail > 0 ? 1 : -1
        );
      }}
      on:rearranged={(e) => {
        tabs.rearrange(pinnedItems);
      }}
    />
  {/each}
</div>
