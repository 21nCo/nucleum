<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { captureStore } from "./capture.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonVariant } from "$lib/client/types/button.type";

  let photoTaken = false;
  let imagePreview: string | null = null;
  const dispatch = createEventDispatcher();

  function handleCapture(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview = e.target?.result as string;
        photoTaken = true;
      };
      reader.readAsDataURL(file);
    }
  }

  function savePhoto() {
    if (imagePreview) {
      fetch(imagePreview)
        .then((res) => res.blob())
        .then((blob) => {
          captureStore.saveCameraCapture(blob);
        });
    }
  }

  function retakePhoto() {
    photoTaken = false;
    imagePreview = null;
  }
</script>

<div
  class="relative flex flex-col items-center justify-between w-full h-full overflow-hidden"
>
  <div
    class="relative w-full h-full overflow-hidden flex items-center justify-center"
  >
    {#if photoTaken && imagePreview}
      <img
        src={imagePreview}
        alt="Captured photo"
        class="max-w-full max-h-full object-contain"
      />
    {:else}
      <div class="text-center">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          on:change={handleCapture}
          class="hidden"
          id="cameraInput"
        />
        <label for="cameraInput" class="cursor-pointer">
          <Button
            icon="ph:camera"
            label="Take Photo"
            type={ButtonVariant.PRIMARY}
            size={Size.lg}
          />
        </label>
      </div>
    {/if}
  </div>

  <div
    class="absolute bottom-20 left-0 right-0 h-24 grid grid-cols-3 gap-4 items-center bg-bgs1 px-4"
  >
    {#if photoTaken}
      <Button
        icon="ph:arrow-clockwise-light"
        label="Retake"
        type={ButtonVariant.DANGER}
        size={Size.sm}
        isPreventMinWidth={true}
        on:click={retakePhoto}
      />
      <Button
        icon="ph:floppy-disk"
        label="Save"
        type={ButtonVariant.PRIMARY}
        size={Size.sm}
        isPreventMinWidth={true}
        on:click={savePhoto}
      />
      <Button
        icon="ph:x"
        label="Cancel"
        size={Size.sm}
        isPreventMinWidth={true}
        on:click={() => {
          captureStore.reset();
          dispatch("close");
        }}
      />
    {:else}
      <div class="col-span-2"></div>
      <Button
        icon="ph:x"
        label="Cancel"
        size={Size.sm}
        isPreventMinWidth={true}
        on:click={() => {
          captureStore.reset();
          dispatch("close");
        }}
      />
    {/if}
  </div>
</div>
