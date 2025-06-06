<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import NotesPopover from "./NotesPopover.svelte";

  export let notes: string | undefined = undefined;
  export let isShort: boolean = false;
</script>

{#if notes}
  <button
    class={cn("cursor-pointer text-fgs3 text-b3 hover:text-fgs1 relative", {
      "underline-dotted": !isShort,
      "flex justify-center items-center": isShort
    })}
    use:popover={{
      content: NotesPopover,
      isRenderAsSibling: true,
      offsetInPx: 12,
      placement: Placement.Left,
      id: "notes-cell-popover",
      componentProps: {
        notes
      }
    }}
  >
    {#if isShort}
      <Icon icon="ph:note-light" size={Size.sm} />
    {:else}
      See notes
    {/if}
  </button>
{:else}
  <span class="text-fgs4"> - </span>
{/if}
