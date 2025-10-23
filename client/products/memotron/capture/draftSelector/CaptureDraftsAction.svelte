<script lang="ts">
  import { popover } from "@21n/actions/popover.action";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import { captureStore } from "@21n/products/memotron/capture/capture.store";
  import type { ICapture } from "@21n/products/memotron/capture/capture.type";
  import { onMount } from "svelte";
  import DraftsPopover from "@21n/products/memotron/capture/draftSelector/DraftsPopover.svelte";
  import { Placement } from "@21n/types/direction.enum";
  import { createEventDispatcher } from "svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { isSameResource } from "@21n/components/flux/resourceStores/resource.utils";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { appEvents } from "@21n/stores/notification.store";
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
    appEvents.nav("capture-drafts-popover");
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
