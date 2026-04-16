<script lang="ts">
  import { onMount } from "svelte";
  import { appStore } from "@21n/stores/app.store";
  import { MemotronAction } from "@21n/products/memotron/memotronAction.enum";
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { logger } from "@21n/components/debug/logger.client";

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
        accessMode: AccessMode.POP
      });
    }
  }

  onMount(() => {
    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("paste", handlePaste);
    };
  });
</script>
