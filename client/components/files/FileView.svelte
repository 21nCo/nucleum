<script lang="ts">
  import type { IRecordId } from "@21n/types/data.type";
  import {
    FileType,
    type IFile,
    type IImageRepositionerOptions
  } from "@21n/components/files/file.type";
  import { fileStore } from "@21n/components/files/file.store";
  import { logger } from "@21n/components/debug/logger.client";
  import { onMount } from "svelte";
  import {
    fileLoader,
    fileLoaderv2
  } from "@21n/actions/lazyload.action";
  import { imageRepositioner } from "@21n/actions/imageRepositioning.action";
  import { createEventDispatcher } from "svelte";
  import { isSameResource } from "@21n/components/flux/resourceStores/resource.utils";
  import { debouncer } from "@21n/utils/utils";

  const dispatch = createEventDispatcher();

  export let file: IFile | undefined = undefined;
  export let id: IRecordId | undefined = undefined;
  export let blob: Blob | undefined = undefined;
  export let isLazyLoad: boolean = false;
  export let type: FileType = FileType.UNKNOWN;
  export let isDraggable: boolean = false;
  export let style: string = "";
  export let ref: HTMLElement | undefined = undefined;
  export let repositionParams: IImageRepositionerOptions | undefined =
    undefined;
  export let isHideControls: boolean = false;
  export let renderingDetails: any = undefined;
  /**
   * If true, then use the thumbnail if available
   */
  export let isUseThumbnailIfAvailable: boolean = false;
  export let isApplyBgColor: boolean = false;
  let classList: string = "";
  export { classList as class };
  $: _id = id ?? file?.id;

  function resolveType() {
    if (!id && !file && !blob) {
      return FileType.UNKNOWN;
    }
    if (blob) {
      return blob.type.split("/")[0] as FileType;
    }
    const idVal = id ?? file?.id;
    const typePart = idVal?.toString()?.split(":")[1]?.split("_")[0];
    if (!typePart) return FileType.UNKNOWN;
    return typePart as FileType;
  }

  onMount(async () => {
    // if (!isLazyLoad) await resolveSrc();
    if (type === FileType.UNKNOWN) type = resolveType();
  });

  async function resolveSrc(): Promise<string> {
    const isLatestFilePresent = file && _id && isSameResource(file, _id);
    if (blob) return URL.createObjectURL(blob);
    else if (id || isLatestFilePresent) {
      const fileToRefresh = isLatestFilePresent ? file : id;
      if (!fileToRefresh) return "";
      const result = await fileStore.refresh(fileToRefresh, {
        isUseThumbnailIfAvailable
      });
      if (result) {
        file = result;
        if (isUseThumbnailIfAvailable && file?.thumbnailUrl) {
          return file.thumbnailUrl;
        }
        return file.url ?? "";
      }
    }
    return "";
  }

  function handlePositionChange(newPosition: number) {
    dispatch("reposition", newPosition);
    debouncedRepositionPropagation(newPosition);
  }
  const debouncedRepositionPropagation = debouncer((newPosition: number) => {
    dispatch("repositionDebounced", newPosition);
  }, 1000);

  function onImageLoad(e: Event) {
    if (ref && ref instanceof HTMLImageElement) {
      renderingDetails = {
        originalHeight: ref.naturalHeight,
        originalWidth: ref.naturalWidth,
        renderedHeight: ref.clientHeight,
        renderedWidth: ref.clientWidth
      };
    }
    dispatch("load", e);
  }
</script>

{#if type === FileType.IMAGE || (isUseThumbnailIfAvailable && file?.thumbnailUrl)}
  <img
    alt="..."
    on:load={onImageLoad}
    class={classList + " ph-no-capture userdata"}
    draggable={isDraggable}
    use:fileLoaderv2={{
      source: resolveSrc,
      isLazyLoad,
      id: _id?.toString(),
      isApplyBgColorFromImage: isApplyBgColor
    }}
    use:imageRepositioner={{
      onPositionChange: handlePositionChange,
      ...(repositionParams ?? {
        enabled: false
      })
    }}
    {style}
    bind:this={ref}
    on:dragstart
    on:dragend
    on:dragover
    on:dragenter
    on:dragleave
    on:drop
  />
{:else if type === FileType.VIDEO}
  <video
    controls={!isHideControls}
    class={classList + " ph-no-capture userdata"}
    draggable={isDraggable}
    use:fileLoaderv2={{ source: resolveSrc, isLazyLoad, id: _id?.toString() }}
    {style}
    bind:this={ref}
    on:dragstart
    on:dragend
    on:dragover
    on:dragenter
    on:dragleave
    on:drop
  >
    <track kind="captions" />
  </video>
{:else if type === FileType.AUDIO}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!--  -->
{:else if type === FileType.PDF}
  <!--  -->
{/if}

<style>
  .leftThrobbing {
    animation: leftThrobbing 1s infinite;
  }
  .rightThrobbing {
    animation: rightThrobbing 1s infinite;
  }
  .topThrobbing {
    animation: topThrobbing 1s infinite;
  }
  .bottomThrobbing {
    animation: bottomThrobbing 1s infinite;
  }
  @keyframes leftThrobbing {
    0% {
      border-left-color: green;
    }
    50% {
      border-left-color: rgb(14, 153, 247);
    }
    100% {
      border-left-color: green;
    }
  }
  @keyframes rightThrobbing {
    0% {
      border-right-color: green;
    }
    50% {
      border-right-color: rgb(14, 153, 247);
    }
    100% {
      border-right-color: green;
    }
  }
  @keyframes topThrobbing {
    0% {
      border-top-color: green;
    }
    50% {
      border-top-color: rgb(14, 153, 247);
    }
    100% {
      border-top-color: green;
    }
  }
  @keyframes bottomThrobbing {
    0% {
      border-bottom-color: green;
    }
    50% {
      border-bottom-color: rgb(14, 153, 247);
    }
    100% {
      border-bottom-color: green;
    }
  }
</style>
