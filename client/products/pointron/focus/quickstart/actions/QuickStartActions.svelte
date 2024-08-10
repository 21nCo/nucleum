<script lang="ts">
  import Autocomplete from "$lib/client/elements/autocomplete/Autocomplete.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { Display } from "$lib/client/types/view.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import TagsContainer from "../../../goals/TagsContainer.svelte";
  import QuickStartLayoutToggle from "./QuickStartLayoutToggle.svelte";
  export let searchInput = "";
  export let selectedTagId = "";
  let isShowSearchBar = false;
  export let context: "bar" | "topright" = "bar";
  let searchInputRef: any;
  $: {
    if (searchInputRef) {
      searchInputRef.focus();
    }
  }
</script>

{#if context === "topright"}
  <div class="flex gap-2">
    <QuickStartLayoutToggle />
  </div>
{:else if $view.display === Display.MO}
  <div
    class={cn("flex w-full gap-3 max-w-full items-center h-10 min-h-[2.5rem]")}
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
      <div class="flex justify-center w-[12%]">
        <Button
          icon="search"
          size={Size.lg}
          on:click={() => {
            isShowSearchBar = true;
          }}
        />
      </div>
      <div class="w-[76%]">
        <TagsContainer bind:selectedTagId on:select />
      </div>
      <div class="flex justify-center w-[12%]">
        <QuickStartLayoutToggle />
      </div>
    {/if}
  </div>
{:else}
  <Autocomplete
    bind:this={searchInputRef}
    inputClassList="rounded-full"
    bind:inputValue={searchInput}
    placeholder="search goals (Cmd + Q)"
    on:search
    on:reset={() => {
      isShowSearchBar = false;
    }}
  />
  <TagsContainer bind:selectedTagId on:select />
{/if}
