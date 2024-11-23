<script lang="ts">
  import type { IProperty } from "$lib/client/products/memotron/collection/properties/property.type";
  import Divider from "$lib/client/elements/Divider.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Orientation, Placement } from "$lib/client/types/direction.enum";
  import type { IPopoverOptions } from "$lib/client/types/popover.type";
  import EndText from "../EndText.svelte";
  import SelectOptionsEditor from "./SelectOptionsEditor.svelte";
  import { popover } from "$lib/client/actions/popover.action";
  import SelectPropertyItem from "../../SelectPropertyItem.svelte";

  export let property: IProperty;
  let popoverOptions: IPopoverOptions = {
    id: "select-property-config-popover",
    class: "h-96",
    isSpanToTriggerWidth: true
  };
  let ref: any;
  if (!property.config) {
    property.config = {
      options: [],
      groups: []
    };
  }
</script>

{#if property.config}
  <!-- <Popover
    bind:this={ref}
    options={popoverOptions}
    triggerClass="flex gap-2 w-full h-full items-center"
  >
    <span class="flex items-center w-1/5 h-full gap-2">
      <Icon icon="list" />
      <Icon icon="chevdown" />
    </span>
    <span class="flex gap-2 items-center w-4/5 h-full">
      <Divider
        orientation={Orientation.Vertical}
        colorStrength={ColorStrength.Strong}
      />
      <span class="flex w-full justify-between items-center">
        <span>-</span>
        <EndText text="Default" />
      </span>
    </span>
    <svelte:fragment slot="popover">
      <SelectOptionsEditor bind:config={property.config} />
    </svelte:fragment>
  </Popover> -->

  <div class="flex gap-2 w-full h-full items-center">
    <span
      class="flex items-center w-1/5 h-full gap-2"
      use:popover={{
        content: SelectOptionsEditor,
        placement: Placement.BottomCenter,
        componentProps: {
          config: property.config,
          defaultOptionId: property.default,
          onChange: (e) => {
            property.config = e;
          },
          onDefault: (e) => {
            property.default = e;
          }
        }
      }}
    >
      <Icon icon="list" />
      <Icon icon="chevdown" />
    </span>
    <span class="flex gap-2 items-center w-4/5 h-full">
      <Divider
        orientation={Orientation.Vertical}
        colorStrength={ColorStrength.Strong}
      />
      <span class="flex w-full justify-between items-center">
        {#if property.default}
          <span>
            <SelectPropertyItem
              item={property.config.options?.find(
                (x) => x.id === property.default
              )}
              isSelectedContext={true}
            />
          </span>
          <EndText text="Default" />
        {:else}
          <span class="text-b3 text-fgs2"> No default set </span>
        {/if}
      </span>
    </span>
  </div>
{/if}
