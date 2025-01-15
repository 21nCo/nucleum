<script lang="ts">
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import type { IArea } from "./types";
  import { feedbackPane, webpage } from "./store";
  import {
    NodeType,
    type IWebScreenshotClip
  } from "$lib/client/products/memotron/node/node.type";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { relayToBackgroundScript } from "$lib/client/utils/extension.utils";
  import type { OmitForCapture } from "$lib/client/components/flux/resourceStores/resource.type";
  const dispatch = createEventDispatcher();
  let screenshotElement: HTMLElement;
  let topValue: number = 0;
  let leftValue: number = 0;
  let widthValue: number = 0;
  let heightValue: number = 0;
  let lockedTopValue: number = -1;
  let lockedLeftValue: number = -1;
  let recordMousemove: boolean = false;
  let bgColor: string = "rgba(0,0,0,0.1)";
  let borderColor: string = "rgba(0,0,0,0.1)";
  let isSaveInProgress: boolean = false;

  /**
   * @summary Sets the capture area shade color
   * @description Gets the background color of the body element and converts it to RGB values then inverts the RGB values to form a visible color for the capture area shade
   */
  onMount(() => {
    screenshotElement.style.cursor = "crosshair";
    const bodyBackgroundColor = getComputedStyle(document.body).backgroundColor;
    const rgbValues: any = bodyBackgroundColor.match(/\d+/g);
    const red = parseInt(rgbValues[0]);
    const green = parseInt(rgbValues[1]);
    const blue = parseInt(rgbValues[2]);
    const compRed = 255 - red;
    const compGreen = 255 - green;
    const compBlue = 255 - blue;
    bgColor = `rgba(${compRed},${compGreen},${compBlue},0.1)`;
    borderColor = `rgba(${compRed},${compGreen},${compBlue},0.5)`;
  });

  async function saveSnip(uploadResponse: any) {
    try {
      if (!uploadResponse || !uploadResponse.id) return;
      const snip: OmitForCapture<IWebScreenshotClip> = {
        contentType: NodeType.WEB_SCREENSHOT_CLIP,
        body: {
          file: uploadResponse.id
        }
      };
      const response = await webpage.saveClip(snip);
      dispatch("saved", { id: response?.id });
    } catch (e) {
      logger.error({ at: "ScreenShot - saveSnip", error: e });
    } finally {
      feedbackPane.onPageSaveSuccess("Screenshot saved!");
    }
  }

  function processScreenshot(data, area: IArea) {
    feedbackPane.onPageSaveStart("Processing screenshot");
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = data;
    const canvas = document.createElement("canvas");
    const dpr = window.devicePixelRatio || 1;
    const scaledArea = {
      x: area.x * dpr,
      y: area.y * dpr,
      width: area.width * dpr,
      height: area.height * dpr
    };
    canvas.width = scaledArea.width;
    canvas.height = scaledArea.height;
    const canvasContext = canvas.getContext("2d");
    img.onload = async () => {
      const screenshotDimensions = await getScreenshotDimensions(data);
      logger.log({
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        screenshotDimensions,
        dpr,
        area,
        scaledArea
      });
      if (canvasContext) {
        canvasContext.drawImage(
          img,
          scaledArea.x,
          scaledArea.y,
          scaledArea.width,
          scaledArea.height,
          0,
          0,
          scaledArea.width,
          scaledArea.height
        );
        const contentType = "image/png";
        const dataUrl = canvas.toDataURL(contentType);

        const response = await relayToBackgroundScript({
          event: ExtensionEvent.UPLOAD_FILE,
          data: { dataUrl, contentType }
        });
        saveSnip(response);
      }
    };
  }
  async function snip(area: IArea) {
    await resetComputedValues();
    if (area.width <= 5 || area.height <= 5) return;
    const data = await relayToBackgroundScript({
      event: ClipperExtensionEvent.SCREENSHOT
    });
    processScreenshot(data.data, area);
  }

  function getScreenshotDimensions(
    dataUrl: string
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
      };
      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
      img.src = dataUrl;
    });
  }

  /**
   * @summary To remove the captured area shade on the screen before screenshot is taken
   * await tick() doesn't work as expected thus capturing the shade also at times thus using setTimeout
   */
  function resetComputedValues(): Promise<void> {
    return new Promise(async (resolve) => {
      topValue = 0;
      leftValue = 0;
      heightValue = 0;
      widthValue = 0;
      lockedTopValue = -1;
      lockedLeftValue = -1;
      setTimeout(() => {
        resolve();
      }, 10);
    });
  }
  function onMousedown(e: MouseEvent) {
    topValue = e.clientY;
    leftValue = e.clientX;
    recordMousemove = true;
  }

  function onMousemove(e: MouseEvent) {
    if (!recordMousemove) return;
    if (lockedTopValue !== -1)
      heightValue = Math.abs(e.clientY - lockedTopValue);
    else heightValue = Math.abs(e.clientY - topValue);
    if (e.clientY <= topValue || e.clientY <= lockedTopValue) {
      if (lockedTopValue === -1) {
        lockedTopValue = topValue;
      }
      topValue = e.clientY;
    } else if (e.clientY > lockedTopValue) {
      lockedTopValue = -1;
    }

    if (lockedLeftValue !== -1)
      widthValue = Math.abs(e.clientX - lockedLeftValue);
    else widthValue = Math.abs(e.clientX - leftValue);
    if (e.clientX <= leftValue || e.clientX <= lockedLeftValue) {
      if (lockedLeftValue === -1) {
        lockedLeftValue = leftValue;
      }
      leftValue = e.clientX;
    } else if (e.clientX > lockedLeftValue) {
      lockedLeftValue = -1;
    }
  }
  function onMouseup(e: MouseEvent) {
    try {
      if (!recordMousemove) return;
      isSaveInProgress = true;
      snip({
        x: leftValue,
        y: topValue,
        width: widthValue,
        height: heightValue
      });
      recordMousemove = false;
    } catch (e) {
      logger.error({ at: "ScreenShot - onMouseup", error: e });
    } finally {
      $feedbackPane.isShowStatusOnly = false;
      $feedbackPane.isPreventAutoClose = false;
    }
  }
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      dispatch("close");
    }
  }
</script>

<button
  bind:this={screenshotElement}
  class={cn("-z-10 fixed h-dvh w-full")}
  on:mousedown={onMousedown}
  on:mouseup={onMouseup}
  on:mousemove={onMousemove}
>
  <div
    class="fixed inset-0"
    style="
  background-color: {isSaveInProgress ? 'transparent' : bgColor};
  clip-path: polygon(
    0 0,
    100% 0,
    100% 100%,
    0 100%,
    0 0,
    {leftValue}px {topValue}px,
    {leftValue}px {topValue + heightValue}px,
    {leftValue + widthValue}px {topValue + heightValue}px,
    {leftValue + widthValue}px {topValue}px,
    {leftValue}px {topValue}px
  );
"
  />
  <div
    class="fixed rounded-sm"
    style="
    top: {topValue}px;
    left: {leftValue}px;
    height: {heightValue}px;
    width: {widthValue}px;
    border:1px dotted {isSaveInProgress ? 'transparent' : borderColor};
    pointer-events: none;
  "
  />
  <!--
  <div
    class="fixed rounded-md"
    style="top:{topValue}px; left:{leftValue}px;height:{heightValue}px; width:{widthValue}px;border:1.5px solid {bgColor};"
  ></div> -->
</button>
<svelte:window on:keydown={handleKeyDown} />
