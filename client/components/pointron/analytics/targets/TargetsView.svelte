<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import TargetGuages from "./TargetGuages.svelte";
  export let data: any;
</script>

<div class="w-full flex flex-col gap-6 pb-4">
  <div class="flex px-4">
    <Text style={TextStyle.PANEL_HEADING} content="Targets" />
  </div>
  {#if isValidArrayWithData(data)}
    <div class="flex justify-evenly w-full flex-wrap">
      <TargetGuages size={Size.md} {data} />
    </div>
  {:else}
    <EmptyStatusView
      size={Size.sm}
      mainText="No targets set"
      subText="Set targets to see them here"
      actionText="Set targets"
      on:click={() => {
        appStore.gotoPath("/cp/targets");
      }}
    />
  {/if}
</div>
