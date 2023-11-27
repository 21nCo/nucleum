<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { appStore, modalEvent } from "$lib/tidy/stores/app.store";
  import { LaunchContext } from "$lib/tidy/types/appStore.type";
  import type { ModalParams } from "$lib/tidy/types/popup.type";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  export let params: ModalParams;
  export let isShowClose: boolean = true;
</script>

{#if $appStore.launchContext != LaunchContext.EMBED}
  <div class="popover-header flex w-full justify-between rounded-t-md">
    <Text
      style={TextStyle.PANEL_HEADING}
      width="min-w-fit"
      content={params.path.split("_").join(" ")}
    />
    {#if isShowClose && params.isDismissable}
      <div class="w-full flex justify-end text-b2">
        <Icon
          icon="cross"
          on:click={() => {
            modalEvent.notify({ path: params.path, isShow: false });
          }}
        />
      </div>
    {/if}
  </div>
{/if}
