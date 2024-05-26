<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import account from "$lib/client/stores/account.store";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { isValidString } from "$lib/client/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  export let src: string | undefined = undefined;
  let file: File;
  let fileInput: HTMLInputElement;
  let isUploadInProgress = false;
  function triggerFileSelect() {
    fileInput.click();
  }
  async function handleFileChange(event: Event) {
    isUploadInProgress = true;
    file = (event.target as HTMLInputElement).files[0];
    let imageLocalURL = new Blob([file], { type: file.type });
    let s3Response = await account.uploadFile(
      file.type,
      file.name,
      imageLocalURL
    );
    console.log("s3Response - cover photo", s3Response);
    let s3URL = s3Response?.uploadURL.split("?")[0];
    if (s3URL) {
      src = s3URL;
    }
    isUploadInProgress = false;
  }
  function onreplace(e: MouseEvent) {
    triggerFileSelect();
    e.stopPropagation();
  }
  function onCoverClick() {
    if ($isInEditMode && !src) {
      triggerFileSelect();
    }
  }
  function onremove(e: MouseEvent) {
    src = undefined;
    e.stopPropagation();
  }
</script>

{#if (isValidString(src) && !$isInEditMode) || $isInEditMode}
  <button
    class={cn(
      "relative h-72 w-full flex justify-center items-center px-4 pt-4",
      {
        "bg-bgs2 cursor-pointer": !src,
        "cursor-default": src
      }
    )}
    on:click={onCoverClick}
  >
    {#if src}
      <!-- svelte-ignore a11y-missing-attribute -->
      <img {src} class="h-full w-full object-cover rounded-xl" />
      <!-- TODO - if src and isInEditMode - drag to reposition -->
    {:else if $isInEditMode && !isUploadInProgress}
      + Add cover photo
    {/if}
    {#if $isInEditMode && src}
      <div class="absolute flex gap-2 bottom-0 right-0 mr-6 mb-2">
        <Button
          label="replace cover"
          icon="sync"
          size={Size.xs}
          on:click={onreplace}
        />
        <Button
          label="remove"
          icon="trash"
          type={ButtonVariant.DANGER}
          size={Size.xs}
          on:click={onremove}
        />
      </div>
    {/if}
    {#if isUploadInProgress}
      <div
        class="absolute inset-0 flex justify-center items-center bg-bgs2 bg-opacity-50"
      >
        <div class="flex flex-col gap-2 items-center">
          <span class="text-h4">Uploading...</span>
          <div class="loader" />
        </div>
      </div>
    {/if}
    <input
      type="file"
      accept="image/*"
      on:change={handleFileChange}
      bind:this={fileInput}
      style="display: none;"
    />
  </button>
{/if}
