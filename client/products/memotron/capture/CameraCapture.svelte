<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { captureStore } from "./capture.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { ButtonVariant } from "$lib/client/types/button.type";
  import view from "$lib/client/stores/view.store";
  import { logger } from "$lib/client/components/debug/logger.client";

  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let photoTaken = false;
  let containerHeight: number;
  let containerWidth: number;
  let isSaving = false;
  const dispatch = createEventDispatcher();
  let error: string | null = null;

  onMount(() => {
    containerHeight = window.innerHeight;
    containerWidth = window.innerWidth;
    startCamera();
  });

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment"
        }
      });
      if (!videoElement) return;
      videoElement.srcObject = stream;
      videoElement.onloadedmetadata = () => {
        adjustVideoSize();
      };
    } catch (e) {
      console.error("Error accessing the camera: ", e);
      error = "No Camera found.";
    }
  }

  function adjustVideoSize() {
    const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
    const containerAspect = containerWidth / containerHeight;

    if (videoAspect > containerAspect) {
      videoElement.style.width = "100%";
      videoElement.style.height = "auto";
    } else {
      videoElement.style.width = "auto";
      videoElement.style.height = "100%";
    }
    videoElement.style.objectFit = "contain";
  }

  function capturePhoto() {
    if (canvasElement && videoElement) {
      const { videoWidth, videoHeight } = videoElement;
      const { width: containerWidth, height: containerHeight } =
        videoElement.getBoundingClientRect();

      canvasElement.width = videoWidth;
      canvasElement.height = videoHeight;

      const context = canvasElement.getContext("2d");
      context?.drawImage(videoElement, 0, 0, videoWidth, videoHeight);

      photoTaken = true;
    }
  }

  function savePhoto() {
    if (!canvasElement) {
      error = "Something went wrong. Please try again.";
      return;
    }
    try {
      isSaving = true;
      canvasElement.toBlob(async (blob) => {
        if (blob) {
          await captureStore.saveCameraCapture(blob);
        }
      }, "image/jpeg");
    } catch (e) {
      error = "Something went wrong. Please try again.";
      logger.error({ at: "CameraCapture.savePhoto", error: e });
    } finally {
      isSaving = false;
    }
  }

  function retakePhoto() {
    photoTaken = false;
  }
</script>

<div
  class="relative flex flex-col items-center justify-between w-full h-full overflow-hidden"
  style={$view.isConstrainedWidth
    ? `height: ${containerHeight}px; width: ${containerWidth}px;`
    : ""}
>
  {#if error}
    <span class="absolute inset-0 flex items-center justify-center text-ars1">
      {error}
    </span>
  {/if}
  <div
    class="relative w-full h-full overflow-hidden flex items-center justify-center"
  >
    <video
      bind:this={videoElement}
      class="max-w-full max-h-full"
      class:hidden={photoTaken}
      autoplay
      playsinline
      muted
      disablePictureInPicture
      controlsList="nodownload nofullscreen noremoteplayback"
    ></video>
    <canvas
      bind:this={canvasElement}
      class="max-w-full max-h-full object-contain"
      class:hidden={!photoTaken}
    ></canvas>
  </div>

  <div
    class="absolute mo:bottom-20 bottom-0 left-0 right-0 h-24 grid grid-cols-3 gap-4 items-center bg-bgs1 px-4"
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
        isLoading={isSaving}
        isPreventMinWidth={true}
        on:click={savePhoto}
      />
      <Button
        icon="ph:x"
        label="Cancel"
        size={Size.sm}
        isPreventMinWidth={true}
        on:click={() => dispatch("cancel")}
      />
    {:else}
      <div class="col-span-1"></div>
      <div class="col-span-1 flex justify-center">
        <button
          class="self-center w-16 h-16 rounded-full bg-aps1 border-none outline-none cursor-pointer relative"
          on:click={capturePhoto}
        >
          <div class="absolute inset-1 rounded-full border-4 border-bgs1"></div>
        </button>
      </div>
      <div class="col-span-1 flex justify-center">
        <Button
          icon="ph:x"
          label="Cancel"
          size={Size.sm}
          isPreventMinWidth={true}
          on:click={() => dispatch("cancel")}
        />
      </div>
    {/if}
  </div>
</div>

<style>
  .hidden {
    display: none;
  }
</style>
