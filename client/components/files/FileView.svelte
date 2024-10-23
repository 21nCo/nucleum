<script lang="ts">
  import type { IRecordId } from "$lib/client/types/data.type";
  import {
    FileType,
    type IFile,
    type IImageRepositionerOptions
  } from "./file.type";
  import { fileStore } from "./file.store";
  import { logger } from "../debug/logger.client";
  import { onMount } from "svelte";
  import {
    fileLoader,
    fileLoaderv2
  } from "$lib/client/actions/lazyload.action";
  import { imageRepositioner } from "$lib/client/actions/imageRepositioning.action";
  import { createEventDispatcher } from "svelte";
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
    if (file?.url && _id === file?.id) return file.url;
    else if (file?.data && _id === file?.id)
      blob = new Blob([file.data], { type: file.type });
    if (blob) return URL.createObjectURL(blob);
    if (!id) return "";
    const response = await fileStore.select(id);
    if (!response) return "";
    if (response.url) {
      file = response;
      return file?.url ?? "";
    } else if (response.data) {
      file = {
        ...response,
        url: URL.createObjectURL(
          new Blob([response.data], { type: response.type })
        )
      };
      return file?.url ?? "";
    } else {
      return "";
    }
  }

  function handlePositionChange(newPosition: number) {
    dispatch("reposition", newPosition);
  }
</script>

{#if type === FileType.IMAGE}
  <img
    alt="file"
    on:load
    class={classList}
    draggable={isDraggable}
    use:fileLoaderv2={{ source: resolveSrc, isLazyLoad, id: _id?.toString() }}
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
    controls
    class={classList}
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
  <audio
    controls
    class={classList}
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
  </audio>
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
