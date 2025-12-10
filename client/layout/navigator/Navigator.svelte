<script lang="ts">
  import { vTrail } from "../topNav/tabs/tabs.store";
  import TopBarResourceItem from "../topNav/tabs/TopBarResourceItem.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import BoxButton from "@21n/elements/button/BoxButton.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { isRecordId } from "@21n/components/flux/resourceStores/resource.utils";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "@21n/types/size.enum";
  import ComingSoonView from "@21n/elements/ComingSoonView.svelte";
  import Badge from "@21n/elements/text/Badge.svelte";

  function handleClick(item: IRecordId) {
    vTrail.activate(item);
  }
</script>

<div class="flex flex-col h-full w-full gap-2">
  <div
    class="w-full h-10 flex items-center justify-between border-b border-brs3"
  >
    <div class="px-3 flex items-center gap-2">
      <span> Navigator </span>
      <Badge text="new" size={Size.sm} />
    </div>
    <div class="h-full w-10">
      <BoxButton
        icon="cross"
        on:click={() => {
          appStore.toggleSearchParam([AppSearchParam.RIGHT]);
        }}
      />
    </div>
  </div>
  <div class="grid grid-rows-2 grow w-full">
    <div class="flex flex-col gap-2 w-full truncate">
      <!-- TODO - recently opened items if global or no items are currently opened - if currently opened present - show switcher for recently opened - currently opened -->
      <div class="text-b2 text-fgs3 w-full bg-bgs2 px-3">Currently opened</div>
      {#if $vTrail.items.length > 0 && $vTrail.base}
        <div class="pl-3 pr-2 trail relative flex flex-col gap-2">
          {#if isRecordId($vTrail.base) && $vTrail.base}
            <div class="-ml-2">
              <TopBarResourceItem
                item={$vTrail.base}
                isInterimTab={true}
                on:click={() => {
                  if (!$vTrail.base) return;
                  handleClick($vTrail.base);
                }}
                isTrail
              />
            </div>
          {/if}
          {#each $vTrail.items as item (item)}
            {@const parts = item.split("-")}
            <div
              class="relative trail-item"
              style={`padding-left: ${parts.length * 5}px;`}
            >
              <TopBarResourceItem
                item={parts[parts.length - 1]}
                on:click={() => handleClick(item)}
                isInterimTab={true}
                isTrail
                on:close={() => {
                  vTrail.remove(item);
                }}
              />
            </div>
          {/each}
        </div>
      {:else}
        <EmptyStatusView size={Size.sm} mainText="No items opened" />
      {/if}
    </div>
    <div class="flex flex-col gap-2 px-3 border-t border-brs3 py-1">
      <!-- TODO - Frequently accessed from: (record or global: in last 30 days) if local dropdown selectable for global - todo after datafn implementation - recent items, access maps -->
      <div class="text-b2 text-fgs3">Frequently accessed</div>
      <ComingSoonView size={Size.sm} />
    </div>
  </div>
</div>

<style>
  .trail::before {
    content: "";
    position: absolute;
    top: 0;
    left: 10px;
    height: 100%;
    width: 0%;
    z-index: 0;
    opacity: 0.7;
    border-right: 1px dashed rgb(var(--colors-fgs4));
  }

  .trail-item::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    height: 50%;
    width: 100%;
    z-index: 0;
    opacity: 0.7;
    border-bottom: 1px dashed rgb(var(--colors-fgs4));
  }
</style>
