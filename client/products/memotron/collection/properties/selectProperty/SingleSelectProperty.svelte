<script lang="ts">
  import { InputStyle, type InputLabel } from "$lib/client/types/input.type";
  import { createEventDispatcher } from "svelte";
  import { Size } from "$lib/client/types/size.enum";
  import InputBaseElement from "$lib/client/elements/InputBaseElement.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import SelectPropertyItem from "./SelectPropertyItem.svelte";
  import type { IProperty, PropertyConfigOption } from "../property.type";
  import { popover } from "$lib/client/actions/popover.action";
  import SelectPropertyPopover from "./SelectPropertyPopover.svelte";
  const dispatch = createEventDispatcher();
  export let property: IProperty;
  export let style: InputStyle = InputStyle.FILLED;
  export let label: InputLabel | undefined = undefined;
  export let value: string;
  export let parentBackgroundIndex: number = 0;
  export let dev_isHideEditOptions: boolean = false;
  let isOptionsVisible: boolean = false;
  let classList = "relative flex flex-col items-start gap-1 w-full";
  let ref: HTMLElement;
  function onSelect(val: string) {
    value = val;
    dispatch("change", val);
    hidePopover();
  }

  function onNewOption(option: PropertyConfigOption) {
    dispatch("newOption", option);
    hidePopover();
  }
  function onConfigChange(changes: any) {
    property.config = changes.config;
    dispatch("configChange", changes);
  }

  function hidePopover() {
    ref?.dispatchEvent(new CustomEvent("hide"));
  }
</script>

<div
  bind:this={ref}
  use:popover={{
    content: SelectPropertyPopover,
    isSpanToTriggerWidth: true,
    componentProps: {
      property,
      value,
      dev_isHideEditOptions,
      onNewOption,
      onConfigChange,
      onSelect
    }
  }}
  class={classList}
>
  <InputBaseElement
    class="justify-between gap-4 w-full"
    {style}
    {label}
    isActive={isOptionsVisible}
  >
    <SelectPropertyItem
      item={value === "none"
        ? {
            label: "None",
            color: 50
          }
        : property.config?.options?.find((x) => x.id === value)}
      isSelectedContext={true}
    />
    <Icon icon={isOptionsVisible ? "chevup" : "chevdown"} size={Size.sm} />
  </InputBaseElement>
</div>
