<script lang="ts">
  import Autocomplete from "$lib/client/elements/autocomplete/Autocomplete.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { quickFocusItemStore } from "../../../goals/goal.store";
  import TagsContainer from "../../../goals/TagsContainer.svelte";
  import QuickStartLayoutToggle from "./QuickStartLayoutToggle.svelte";
  export let searchInput = "";
  let isShowSearchBar = false;
  let searchInputRef: any;
</script>

<div
  class={cn("flex w-full gap-1 max-w-full items-center h-10 min-h-[2.5rem]")}
>
  {#if isShowSearchBar}
    <div class="w-full">
      <Autocomplete
        bind:this={searchInputRef}
        inputClassList="rounded-full"
        bind:inputValue={searchInput}
        placeholder="search goals"
        on:search
        on:reset={() => {
          isShowSearchBar = false;
        }}
      />
    </div>
  {:else}
    <div class="flex justify-center shrink-0">
      <Button
        icon="search"
        size={Size.lg}
        on:click={() => {
          isShowSearchBar = true;
        }}
      />
    </div>
    <div class="flex-1 min-w-0">
      <TagsContainer
        bind:selectedTagId={$quickFocusItemStore.selectedTagId}
        on:select
      />
    </div>
    <div class="flex justify-center shrink-0">
      <QuickStartLayoutToggle />
    </div>
  {/if}
</div>
