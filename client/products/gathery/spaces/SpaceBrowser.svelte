<script lang="ts">
  import ModalFooter from "$lib/client/components/modal/ModalFooter.svelte";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import {
    spaceInContext,
    spaceStore
  } from "$lib/client/products/gathery/space.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { GatheryEvent } from "$lib/client/types/gathery/gatheryEvent.enum";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  spaceStore.refresh();
  let selected = $spaceInContext?.label ?? undefined;
</script>

<div class="flex flex-col h-full justify-between items-center">
  {#if isValidArrayWithData($spaceStore?.spaces)}
    <OptionSelector
      options={$spaceStore?.spaces.map((space) => ({
        label: space.label,
        value: space.id
      }))}
      iconOrientation={Orientation.Vertical}
      style={OptionSelectorStyle.OUTLINE}
      {selected}
      labelProps={{ label: "Spaces", orientation: Orientation.Vertical }}
      on:select={(e) => {
        console.log("switch space", e);
        spaceStore.switchToSpace(e.detail);
      }}
    />
  {/if}
  <ModalFooter
    secondaryAction={{
      label: "Close",
      callback: async () => {
        modalEvent.hideSpecific(GatheryEvent.SPACE_BROWSER);
      }
    }}
    primaryAction={{
      label: "Create Space",
      callback: async () => {
        appStore.runAction(GatheryEvent.CREATE_SPACE);
      }
    }}
  />
</div>
