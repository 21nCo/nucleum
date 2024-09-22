<script lang="ts">
  import type { IRecordId } from "$lib/client/types/data.type";
  import { FileType, type IFile } from "./file.type";
  import { fileStore } from "./file.store";
  import { logger } from "../debug/logger.client";
  import { onMount } from "svelte";
  import { fileLoader } from "$lib/client/actions/lazyload.action";
  export let file: IFile | undefined = undefined;
  export let id: IRecordId | undefined = undefined;
  export let blob: Blob | undefined = undefined;
  export let isLazyLoad: boolean = false;
  export let type: FileType = FileType.UNKNOWN;
  let classList: string = "";
  export { classList as class };

  function resolveType() {
    if (!id && !file && !blob) {
      return FileType.UNKNOWN;
    }
    if (blob) {
      return blob.type.split("/")[0] as FileType;
    }
    const idVal = id ?? file?.id;
    const typePart = idVal?.toString().split(":")[1].split("_")[0];
    if (!typePart) return FileType.UNKNOWN;
    return typePart as FileType;
  }

  onMount(async () => {
    // if (!isLazyLoad) await resolveSrc();
    if (type === FileType.UNKNOWN) type = resolveType();
  });

  async function resolveSrc(): Promise<string> {
    logger.log({ at: "FileView.svelte - resolveSrc", file });
    if (file?.url) return file.url;
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
</script>

{#if type === "image"}
  <img
    alt="file"
    class={classList}
    use:fileLoader={{ source: resolveSrc, isLazyLoad }}
  />
{:else if type === "video"}
  <video
    controls
    class={classList}
    use:fileLoader={{ source: resolveSrc, isLazyLoad }}
  >
    <track kind="captions" />
  </video>
{:else if type === "audio"}
  <audio
    controls
    class={classList}
    use:fileLoader={{ source: resolveSrc, isLazyLoad }}
  >
  </audio>
{/if}
