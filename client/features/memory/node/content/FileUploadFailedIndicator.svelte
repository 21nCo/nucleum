<script lang="ts">
  import Icon from "@21n/ui/elements/Icon.svelte";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/ui/elements/button/button.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import {
    retryFileUpload,
    watchFileUploadFailure
  } from "@nucleum/shared-state/files/file-url";

  /**
   * Shows "Upload failed" with a Retry action for a FileFn file whose upload
   * FileFn rejected for good on this device (see watchFileUploadFailure),
   * and nothing otherwise, so a device without the file's bytes keeps its
   * usual placeholder. Retry asks the queue to upload it again once.
   */
  let {
    fileId = undefined,
    class: className = ""
  }: {
    fileId?: string | null;
    class?: string;
  } = $props();

  let isFailed = $state(false);
  let isRetrying = $state(false);

  $effect(() => {
    isFailed = false;
    if (!fileId) return;
    return watchFileUploadFailure(fileId, (failed) => {
      isFailed = failed;
    });
  });

  async function retry(event: MouseEvent) {
    event.stopPropagation();
    if (!fileId || isRetrying) return;
    isRetrying = true;
    try {
      await retryFileUpload(fileId);
    } finally {
      isRetrying = false;
    }
  }
</script>

{#if isFailed && fileId}
  <div
    role="status"
    data-testid="file-upload-failed"
    class={cn(
      "flex items-center gap-2 rounded-md border border-ars1 bg-bgs1 px-2 py-1 text-b3 text-ars1",
      className
    )}
  >
    <Icon icon="warning" size={Size.sm} />
    <span>Upload failed</span>
    <Button
      label="Retry"
      size={Size.xs}
      style={ButtonStyle.OUTLINED}
      isLoading={isRetrying}
      isDisabled={isRetrying}
      onclick={retry}
    />
  </div>
{/if}
