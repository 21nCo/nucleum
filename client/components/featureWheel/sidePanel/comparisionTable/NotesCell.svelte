<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import { Placement } from "$lib/client/types/direction.enum";
  import NotesPopover from "./NotesPopover.svelte";

  export let notes: string | undefined = undefined;
</script>

{#if notes}
  <button
    class="underline-dotted cursor-pointer text-fgs3 text-b3 hover:text-fgs1 relative"
    use:popover={{
      content: NotesPopover,
      isRenderAsSibling: true,
      offsetInPx: 12,
      placement: Placement.Left,
      componentProps: {
        notes
      }
    }}
  >
    See notes
  </button>
{:else}
  <span class="text-fgs4"> - </span>
{/if}
