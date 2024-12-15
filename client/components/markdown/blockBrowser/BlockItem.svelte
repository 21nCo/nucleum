<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { createEventDispatcher } from "svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import type { IBlockBrowserItem } from "./blockBrowser.type";
  import { tooltip } from "$lib/client/actions/popover.action";
  import { Placement } from "$lib/client/types/direction.enum";
  import MdShortcutText from "../shortcuts/MdShortcutText.svelte";

  export let block: IBlockBrowserItem;
  export let width: string = "w-full";
  export let isFocused: boolean = false;
  const dispatch = createEventDispatcher();
  let ref: HTMLElement;
  $: if (isFocused && ref) {
    ref.scrollIntoView({ behavior: "smooth", block: "end" });
  }
</script>

<button
  bind:this={ref}
  class={cn(
    "flex items-center gap-3 text-b2 hover:bg-bgs2 p-2 rounded-md",
    width,
    {
      "bg-bgs2": isFocused,
      "opacity-70 cursor-not-allowed": block.isDisabled
    }
  )}
  on:click={() => {
    if (!block.isDisabled) dispatch("select", block);
  }}
  use:tooltip={{
    disabled: !block.tooltip,
    text: block.tooltip,
    direction: Placement.Bottom
  }}
>
  <div
    class="bg-bgs2 rounded-md p-1 border border-brs3 flex justify-center items-center"
  >
    <Icon icon={block.icon} />
  </div>
  <div class="text-left">{block.label}</div>
  <span class="ml-auto">
    {#if block.badge}
      <Badge text={block.badge} />
    {:else if block.isShowShortcut}
      <span class="text-b3 text-fgs3">
        <MdShortcutText type={block.type} />
      </span>
    {/if}
  </span>
</button>
