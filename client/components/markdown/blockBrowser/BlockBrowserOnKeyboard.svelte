<script lang="ts">
  import {
    calloutBrowserItem,
    codeBrowserItem,
    quoteBrowserItem
  } from "./blockBrowser.utils";
  import { Size } from "$lib/client/types/size.enum";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import BlockBrowserKeyboardItem from "./BlockBrowserKeyboardItem.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { fly } from "svelte/transition";

  export let configData: any;
  export let selectedSection: string;
  const notAvailableOnMobile = [NodeType.CODE];
  const itemsClass =
    "w-full grid gap-3 grid-cols-[repeat(auto-fill,minmax(100px,1fr))]";
  const shorterItemsClass =
    "w-full grid gap-3 grid-cols-[repeat(auto-fill,minmax(80px,1fr))]";

  $: items = configData.config
    .find((section) => section.section === selectedSection)
    ?.children?.filter(
      (c) => !c.isDisabled && !notAvailableOnMobile.includes(c.type)
    );
</script>

<div
  class="flex flex-col justify-between w-full h-full pb-8"
  transition:fly={{ y: 10 }}
>
  <div class="w-full overflow-y-auto min-h-0 flex-1">
    {#if selectedSection === "text"}
      <!--  -->
      <div class="flex flex-col gap-3 w-full">
        <div class={itemsClass}>
          <BlockBrowserKeyboardItem item={quoteBrowserItem} on:select />
          <BlockBrowserKeyboardItem item={calloutBrowserItem} on:select />
          <BlockBrowserKeyboardItem item={codeBrowserItem} on:select />
        </div>
        <div class={shorterItemsClass}>
          {#each configData.headingsSection.children as item}
            <BlockBrowserKeyboardItem {item} on:select />
          {/each}
        </div>
        <div class={itemsClass}>
          {#each configData.listsSection.children as item}
            <BlockBrowserKeyboardItem {item} on:select />
          {/each}
        </div>
      </div>
    {:else}
      <div class={itemsClass}>
        {#if items && items.length > 0}
          {#each items as item}
            <BlockBrowserKeyboardItem {item} on:select />
          {/each}
        {/if}
      </div>
    {/if}
    <ScrollViewBottomSpacer size={Size.sm} />
  </div>
</div>
