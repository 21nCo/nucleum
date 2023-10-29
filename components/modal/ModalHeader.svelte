<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import {
    appStore,
    modalEvent,
    windowObject,
  } from "$lib/tidy/stores/app.store";
  import { LaunchContext } from "$lib/tidy/types/appStore.type";
  import { properCase } from "$lib/tidy/utils/text.utils";
  export let path: string = "";
  export let isShowClose: boolean = true;
</script>

{#if $appStore.launchContext != LaunchContext.EMBED}
  <div class="popover-header flex w-full justify-between rounded-t-md p-4">
    <div
      class="font-medium min-w-fit {$windowObject.isInPortraitMode
        ? 'text-h5'
        : 'text-h3'}"
    >
      {properCase(path.split("_").join(" "))}
    </div>
    {#if isShowClose}
      <div class="w-full flex justify-end text-b2">
        <Icon
          icon="cross"
          on:click={() => {
            modalEvent.notify({ path, isShow: false });
          }}
        />
      </div>
    {/if}
  </div>
{/if}
