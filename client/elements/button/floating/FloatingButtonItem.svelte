<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import type { IButtonParams } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "../../Icon.svelte";
  export let param: IButtonParams;
  export let index: number;
  export let length: number;

  let contextMenuRef: HTMLElement;

  function hideContextMenu() {
    contextMenuRef.dispatchEvent(new CustomEvent("hide"));
  }
</script>

<button
  class={cn(
    "h-10 px-6 bg-aps1 text-abg flex justify-center items-center gap-1 hover:brightness-90",
    {
      "rounded-r-full": index === length - 1,
      "rounded-l-full": index === 0
    }
  )}
  bind:this={contextMenuRef}
  on:click={async () => {
    if (param.callback) await param?.callback();
  }}
  use:popover={{
    content: param.popoverAction?.content,
    placement: param.popoverAction?.placement,
    isRenderAsModalForCW: param.popoverAction?.isRenderAsModalForCW,
    componentProps: {
      ...param.popoverAction?.componentProps,
      onSelect: (e) => {
        hideContextMenu();
      }
    }
  }}
>
  <Icon icon={param.icon} size={Size.sm} class="text-abg" />
  <span class="text-b2">{param.label}</span>
</button>
{#if index !== length - 1}
  <div class="bg-aps1">
    <div class="h-full border-r border-abg opacity-30" />
  </div>
{/if}
