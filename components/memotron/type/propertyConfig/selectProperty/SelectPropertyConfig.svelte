<script lang="ts">
  import type { Property } from "$lib/tidy/types/memotron/type.type";
  import Divider from "$lib/tidy/elements/Divider.svelte";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import Popover from "$lib/tidy/elements/popover/Popover.svelte";
  import { ColorStrength } from "$lib/tidy/types/appearance.type";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import type { PopoverOptions } from "$lib/tidy/types/popover.type";
  import EndText from "../EndText.svelte";
  import SelectOptionsEditor from "./SelectOptionsEditor.svelte";
  export let property: Property;
  let popoverOptions: PopoverOptions = {
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
  <Popover
    bind:this={ref}
    options={popoverOptions}
    triggerClass="flex gap-2 w-full h-full items-center"
  >
    <svelte:fragment slot="trigger">
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
    </svelte:fragment>
    <svelte:fragment slot="popover">
      <SelectOptionsEditor bind:config={property.config} />
    </svelte:fragment>
  </Popover>
{/if}
