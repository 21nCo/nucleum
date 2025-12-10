<script lang="ts">
  import type { IRecordId } from "@21n/types/data.type";
  import { hTrail } from "../topNav/tabs/tabs.store";
  import TopBarResourceItem from "../topNav/tabs/TopBarResourceItem.svelte";
  import TopNavLeftLogo from "../topNav/TopNavLeftLogo.svelte";
  import type { Action } from "@21n/types/action.enum";
  import { isRecordId } from "@21n/components/flux/resourceStores/resource.utils";

  function handleClick(item: Action | IRecordId) {
    hTrail.activate(item);
  }
</script>

<div class="relative flex w-full min-h-11 h-11 bg-bgs2 border-t border-brs3">
  <TopNavLeftLogo
    action={"cross"}
    callback={() => {
      hTrail.clear();
    }}
  />
  <div class="flex items-center gap-6 px-3 relative trail overflow-x-auto">
    {#each $hTrail.path as item (item)}
      <TopBarResourceItem
        {item}
        on:click={() => handleClick(item)}
        isInterimTab={isRecordId(item)}
        isTrail
        on:close={() => {
          hTrail.remove(item);
        }}
      />
    {/each}
  </div>
</div>

<style>
  .trail::before {
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
