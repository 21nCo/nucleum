<script lang="ts">
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import {
    headingNodeTypes,
    NodeType
  } from "$lib/client/products/memotron/node/node.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { get } from "svelte/store";
  import { activeResourceFilter } from "$lib/client/utils/utils";
  import Resources from "./Resources.svelte";
  import { onMount } from "svelte";
  export let isModal: boolean = false;
  let searchQuery: string = "";
  let selectedResource: string = "everything";
  let data: any[] = [];
  onMount(async () => {
    await refreshData();
  });
  function onKeydown(event: any) {}
  const options = [
    {
      value: "everything",
      icon: "tag"
    },
    {
      value: "nodes",
      icon: "node"
    },
    {
      value: "collections",
      icon: "curation"
    }
    // {
    //   label: "Combinations",
    //   value: "combinations",
    //   icon: "curation"
    // },
    // {
    //   value: "files",
    //   icon: "folder"
    // },
    // {
    //   label: "Tasks",
    //   value: "tasks",
    //   icon: "folder"
    // },
    // {
    //   value: "clips",
    //   icon: "paper-clip"
    // }
  ];

  async function refreshData() {
    const dexie = get(dataManager).cacheSource.dexie;
    if (selectedResource === "everything") {
      data = await dexie.node
        .where("contentType")
        .anyOfIgnoreCase([NodeType.NODULAR_MARKDOWN, ...headingNodeTypes])
        .and((node) => activeResourceFilter(node))
        .reverse()
        .sortBy("modifiedAt");
      data = data.concat(await dexie.collection.reverse().sortBy("modifiedAt"));
    } else if (selectedResource === "nodes") {
      data = await dexie.node
        .where("contentType")
        .anyOfIgnoreCase([NodeType.NODULAR_MARKDOWN, ...headingNodeTypes])
        .and((node) => activeResourceFilter(node))
        .reverse()
        .sortBy("modifiedAt");
    } else if (selectedResource === "collections") {
      data = await dexie.collection.reverse().sortBy("modifiedAt");
    }
  }
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
    on:keydown={onKeydown}
    placeholder="Search anything"
  />
  <OptionSelector
    {options}
    bind:selected={selectedResource}
    on:select={refreshData}
  />
  <div class="flex flex-col flex-grow">
    <Resources {data} {selectedResource} />
  </div>
</div>

<style>
  input::placeholder {
    font-weight: lighter;
    color: rgba(var(--colors-fgs2), 0.5);
  }
</style>
