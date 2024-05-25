<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import TypesInDirectory from "./TypesInDirectory.svelte";
  export let isModal: boolean = false;
  let searchQuery: string = "";
  let selectedResource: string = "types";
  const options = [
    {
      value: "nodes",
      icon: "node"
    },
    {
      value: "types",
      icon: "cube"
    },
    {
      value: "curations",
      icon: "curation"
    },
    {
      value: "files",
      icon: "folder"
    },
    {
      value: "clips",
      icon: "paper-clip"
    }
  ];
</script>

<div
  class={cn("w-full h-full flex flex-col gap-6", {
    "p-4": !isModal
  })}
>
  <input
    class="text-h2 w-full bg-transparent focus:outline-none focus:border-none"
    type="text"
    bind:value={searchQuery}
    placeholder="Search anything"
  />
  <OptionSelector {options} bind:selected={selectedResource} />
  {#if selectedResource === "types"}
    <TypesInDirectory />
  {:else}
    <ComingSoonView />
  {/if}
</div>

<style>
  input::placeholder {
    font-weight: lighter;
    color: rgba(var(--colors-fgs2), 0.5);
  }
</style>
