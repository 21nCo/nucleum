<script lang="ts">
  import type { ISelectProperty } from "@21n/components/collection/properties/property.type";
  import Divider from "@21n/elements/Divider.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import Popover from "@21n/elements/popover/Popover.svelte";
  import { ColorStrength } from "@21n/types/appearance.type";
  import { Orientation, Placement } from "@21n/types/direction.enum";
  import type { IPopoverOptions } from "@21n/types/popover.type";
  import EndText from "@21n/components/collection/properties/propertyConfig/EndText.svelte";
  import SelectOptionsEditor from "@21n/components/collection/properties/propertyConfig/selectProperty/SelectOptionsEditor.svelte";
  import { popover } from "@21n/actions/popover.action";
  import SelectPropertyOption from "@21n/components/collection/properties/selectProperty/SelectPropertyOption.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { Size } from "@21n/types/size.enum";

  export let property: ISelectProperty;
  export let isPopoverOpen: boolean = false;
  let dev_isEnableDefaultSelection: boolean = false;
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
  <div class="flex gap-2 px-3 w-full h-full items-center">
    <span
      class={cn("flex items-center h-full gap-2", {
        "w-full justify-between": !dev_isEnableDefaultSelection,
        "w-1/5": dev_isEnableDefaultSelection
      })}
      use:popover={{
        content: SelectOptionsEditor,
        placement: Placement.BottomCenter,
        id: `select-property-config-popover-${property.id || "default"}`,
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
      on:change={(e) => {
        isPopoverOpen = e.detail?.open;
      }}
    >
      <span class="flex gap-2 items-center">
        <Icon icon="list" />
        {#if !dev_isEnableDefaultSelection}
          <span class="text-fgs2 text-b3">
            {property.config.options?.length ?? 0} options
          </span>
        {/if}
      </span>
      <Icon
        icon={isPopoverOpen ? "chevron-up" : "chevron-down"}
        size={Size.sm}
      />
    </span>
    {#if dev_isEnableDefaultSelection}
      <span class="flex gap-2 items-center w-4/5 h-full">
        <Divider
          orientation={Orientation.Vertical}
          colorStrength={ColorStrength.Strong}
        />
        <span class="flex w-full justify-between items-center">
          {#if property.default}
            <span>
              <SelectPropertyOption
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
    {/if}
  </div>
{/if}
