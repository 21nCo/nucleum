<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { MemotronAction } from "../memotronAction.enum";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";

  function handlePaste(event: ClipboardEvent) {
    if (!$appStore.isDnDPageActive) {
      appStore.runAction(MemotronAction.PASTE_CONFIRMATION, {
        componentParams: {
          event
        }
      });
      event.preventDefault();
    }
  }

  function handleDragEnter(event: DragEvent) {
    if (!event.relatedTarget && !$appStore.isDnDPageActive) {
      appStore.runAction(MemotronAction.CAPTURE_DND);
    }
  }

  function handleDragLeave(event: DragEvent) {
    if (
      !event.relatedTarget &&
      !$appStore.isDnDPageActive &&
      !window.location.pathname.includes("/tab")
    ) {
      appStore.closeResource({
        id: MemotronAction.CAPTURE_DND,
        accessMode: ResourceAccessMode.POP
      });
    }
  }
</script>

<svelte:document
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
/>
<svelte:window on:paste={handlePaste} />
