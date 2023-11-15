<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import {
    appStore,
    modalEvent,
    windowObject,
  } from "$lib/tidy/stores/app.store";
  import { LaunchContext } from "$lib/tidy/types/appStore.type";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import { properCase } from "$lib/tidy/utils/text.utils";
  export let path: string = "";
  export let isShowClose: boolean = true;
</script>

{#if $appStore.launchContext != LaunchContext.EMBED}
  <div class="popover-header flex w-full justify-between rounded-t-md">
    <Text
      style={TextStyle.PANEL_HEADING}
      width="min-w-fit"
      content={path.split("_").join(" ")}
    />
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
