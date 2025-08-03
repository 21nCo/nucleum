<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { captureStore } from "../capture.store";
  import type { ICapture } from "../capture.type";
  import { onMount } from "svelte";
  import DraftsPopover from "./DraftsPopover.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { createEventDispatcher } from "svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  export let size: Size = Size.md;
  const dispatch = createEventDispatcher();
  let drafts: ICapture[] = [];
  let ref: HTMLButtonElement;
  onMount(() => {
    refresh();
  });
  async function refresh() {
    const result = await captureStore.selectMany();
    if (isValidArrayWithData(result)) {
      result.sort((a, b) => {
        return (
          new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
        );
      });
      drafts = result;
    }
  }

  async function onDelete(id: IRecordId) {
    await captureStore.delete(id);
    const filteredDrafts = drafts.filter((draft) => !isSameResource(draft, id));
    if (filteredDrafts.length === 0) {
      hidePopover();
    }
    drafts = [...filteredDrafts];
  }
  function hidePopover() {
    ref.dispatchEvent(new Event("hide"));
    appEvents.publish(GlobalEvent.NAV, {
      path: "capture-drafts-popover"
    });
  }
</script>

{#if drafts.length > 0}
  <div class="flex justify-center items-center">
    <button
      class={cn(
        "flex items-center gap-1 notouch:hover:bg-ass2/10 active:bg-ass2/10 rounded-md border border-dashed border-ass1 text-ass1",
        {
          "text-b3 px-2 py-1": size === Size.sm,
          "text-b2 px-3 py-2": size === Size.md
        }
      )}
      bind:this={ref}
      use:popover={{
        content: DraftsPopover,
        placement: Placement.TopCenter,
        isRenderAsModalForCW: true,
        id: "capture-drafts-popover",
        componentProps: {
          drafts,
          onClose: hidePopover,
          onSelect: (draft) => {
            dispatch("select", draft);
            hidePopover();
          },
          onDelete
        }
      }}
    >
      <Icon icon="file" size={Size.sm} class="text-ass1" />
      {drafts.length}
      {drafts.length === 1 ? "draft" : "drafts"} available
    </button>
  </div>
{/if}
