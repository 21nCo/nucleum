<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { UploadStatus } from "$lib/client/types/uploadStatus.enum";
  import { retrieveCurrentColors } from "$lib/client/utils/theme.utils";
  import { createEventDispatcher } from "svelte";
  import view from "$lib/client/stores/view.store";
  import appearance from "$lib/client/stores/appearance.store";

  export let label: string;
  export let size: string;
  export let uploadProgress: number = 100;
  export let uploadStatus: UploadStatus = UploadStatus.NOT_STARTED;

  const dispatch = createEventDispatcher();

  function onRemove() {
    dispatch("remove");
  }
</script>

<div
  class={`w-full flex items-center justify-center gap-4 ${
    $view.isPortrait ? `p-3` : `p-4`
  }`}
>
  <Icon
    color={uploadStatus === UploadStatus.NOT_STARTED
      ? undefined
      : retrieveCurrentColors($appearance)?.aps1}
    icon="image"
  />
  <div class={`w-full flex flex-col  ${$view.isPortrait ? `gap-1` : `gap-2`}`}>
    <div class="flex text-b4 justify-between items-center w-full">
      <div class="text-fgs2">{label} ({size})</div>
      {#if uploadStatus === UploadStatus.NOT_STARTED}
        <Icon size={Size.sm} icon="cross" on:click={onRemove} />
      {:else if uploadStatus === UploadStatus.UPLOADING || uploadProgress !== 100}
        <span class="text-aps1">Uploading</span>
      {:else if uploadStatus === UploadStatus.UPLOADED && uploadProgress === 100}
        <span class="text-ags1">Uploaded</span>
      {/if}
    </div>

    {#if uploadStatus !== UploadStatus.NOT_STARTED}
      <div class="w-full h-[3px] relative rounded-full bg-fgs2">
        <div
          style={`width:${uploadProgress}%;`}
          class="bg-aps1 h-[3px] rounded-full"
        />
      </div>
    {/if}
  </div>
</div>
