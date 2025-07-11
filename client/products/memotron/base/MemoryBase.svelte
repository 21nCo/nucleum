<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { MemotronAction } from "../memotronAction.enum";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { logger } from "$lib/client/components/debug/logger.client";

  function handlePaste(event: ClipboardEvent) {
    try {
      const target = event.target as HTMLElement;
      if (
        !$appStore.isDnDPageActive &&
        target.nodeName !== "INPUT" &&
        target.nodeName !== "TEXTAREA" &&
        !target?.classList?.contains("text-input") &&
        !target?.classList?.contains("inline-markdown")
      ) {
        appStore.runAction(MemotronAction.PASTE_CONFIRMATION, {
          componentParams: {
            event
          }
        });
        event.preventDefault();
      }
    } catch (error) {
      logger.error(error);
    }
  }

  function handleDragEnter(event: DragEvent) {
    if (
      !event.relatedTarget &&
      !$appStore.isDnDPageActive &&
      event.dataTransfer?.effectAllowed !== "move"
    ) {
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
