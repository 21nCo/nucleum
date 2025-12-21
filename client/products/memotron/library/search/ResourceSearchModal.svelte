<script lang="ts">
  import { onMount } from "svelte";
  import ResourceSearchBase from "@21n/products/memotron/library/search/ResourceSearchBase.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { Action } from "@21n/types/action.enum";
  import SearchInput from "@21n/components/search/SearchInput.svelte";

  export let isInline: boolean = false;
  let searchInputRef: SearchInput;
  let searchBaseRef: ResourceSearchBase;

  onMount(async () => {
    if (!isInline) {
      setTimeout(() => {
        searchInputRef?.focus();
      }, 100);
    }
  });
</script>

<ResourceSearchBase
  bind:this={searchBaseRef}
  isGlobalSearchModal={true}
  {isInline}
  on:close={() => {
    if (isInline) return;
    appStore.closeResource({
      id: Action.SEARCH
    });
  }}
>
  {#if !isInline}
    <div class="pl-4 w-full">
      <SearchInput bind:this={searchInputRef} />
    </div>
  {/if}
</ResourceSearchBase>
