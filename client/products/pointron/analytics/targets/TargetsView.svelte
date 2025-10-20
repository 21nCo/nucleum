<script lang="ts">
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { Size } from "@21n/types/size.enum";
  import { TextStyle } from "@21n/types/text.enum";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import TargetGuages from "@21n/products/pointron/analytics/targets/TargetGuages.svelte";
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
