<script lang="ts">
  import Autocomplete from "$lib/client/elements/autocomplete/Autocomplete.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
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
  <!-- <div class="flex gap-2">
    <QuickStartLayoutToggle />
  </div> -->
{:else}
  <div class="flex gap-1 w-full max-w-full items-center h-10 min-h-[2.5rem]">
    {#if isShowSearchBar}
      <div class="flex-grow">
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
      <div class="flex justify-center w-1/12">
        <Button
          icon="search"
          on:click={() => {
            isShowSearchBar = true;
          }}
        />
      </div>
      <div class="w-10/12 px--2">
        <TagsContainer bind:selectedTagId on:select />
      </div>
    {/if}
    <div class="flex justify-center w-1/12">
      <QuickStartLayoutToggle />
    </div>
  </div>
{/if}
