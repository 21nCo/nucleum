<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import ColorPicker from "@21n/elements/colorPicker/ColorPicker.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import Popover from "@21n/elements/popover/Popover.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import { InputStyle } from "@21n/types/input.type";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import CustomColorPropagator from "@21n/elements/style/CustomColorPropagator.svelte";
  import type { IPropertyConfigOption } from "@21n/components/collection/properties/property.type";
  import { hoverable } from "@21n/actions/hover.action";
  import { ButtonStyle } from "@21n/types/button.type";
  import Badge from "@21n/elements/text/Badge.svelte";
  import context from "@21n/stores/context.store";
  import { OperatingSystem } from "@21n/types/context.type";
  const dispatch = createEventDispatcher();
  export let option: IPropertyConfigOption;
  export let index: number;
  export let isFocusing: boolean = false;
  export let isHovering: boolean = false;
  export let isDefault: boolean = false;
  export let groupId: string = "ungrouped";
  export let parentBgIndex: number = 1;
  let textInputRef: any;
  let isColorPickerOpen: boolean = false;
  let colorPickerPopoverRef: any;
  let dev_isEnableDefaultSelection: boolean = false;
  if (isFocusing) textInputRef?.focus();
  onMount(() => {
    if (isFocusing) textInputRef?.focus();
  });
  if (option && !option.color) option.color = Math.random() * 360;

  function onHoverChange(isHovered: boolean) {
    isHovering = isHovered;
  }

  function onOptionKeydown(event: CustomEvent<KeyboardEvent>) {
    const keyboardEvent = event.detail;
    if (!(keyboardEvent instanceof KeyboardEvent)) return;
    if (keyboardEvent.key === "Escape") {
      textInputRef?.blur();
      keyboardEvent.stopPropagation();
    }
  }
</script>

<div
  class={cn(
    "flex relative items-center gap-2 w-full rounded-md px-1 h-10 border",
    {
      "border-brs3": isFocusing,
      "border-transparent": !isFocusing
    }
  )}
  data-index={index}
  data-id={option.id}
  data-group-id={groupId}
  draggable={!isColorPickerOpen}
  use:hoverable={{
    onHover: onHoverChange
  }}
>
  <span class="cursor-move h-full flex flex-col items-center justify-center">
    <Icon icon="rearrange" class="stroke-fgs3" />
  </span>
  <Popover
    triggerClass="flex items-center w-6 h-full"
    bind:isPopoverVisible={isColorPickerOpen}
    bind:this={colorPickerPopoverRef}
    options={{
      class: "w-80 min-h-fit p-4",
      id: "colorpickerforoption"
    }}
  >
    <CustomColorPropagator
      color={option.color}
      class="relative rounded-full h-5 w-5 bg-ccs1"
    >
      <div
        class="absolute top-0.5 left-0.5 rounded-full h-4 w-4 border-[1.5px] border-brs2 bg-ccs1"
      />
    </CustomColorPropagator>
    <div slot="popover" class="flex flex-col items-center justify-center gap-8">
      <ColorPicker
        bind:hue={option.color}
        on:change
        isShowPreview={false}
        label={{ label: "Choose color", orientation: Orientation.Vertical }}
      />
      <Button
        label="Done"
        style={ButtonStyle.OUTLINED}
        size={Size.sm}
        on:click={() => {
          colorPickerPopoverRef?.hide();
        }}
      />
    </div>
  </Popover>
  <TextInput
    bind:this={textInputRef}
    bind:value={option.label}
    style={InputStyle.PLAIN}
    placeholder="option..."
    on:change
    on:enter={(e) => {
      dispatch("enter", option.id);
    }}
    on:keydown={onOptionKeydown}
    on:focus={() => {
      isFocusing = true;
      colorPickerPopoverRef?.hide();
    }}
    on:blur={() => {
      isFocusing = false;
    }}
  />
  <div
    class={cn("flex items-center h-full right-0 pr-1 rounded-r-md", {
      "absolute pl-4": !isFocusing,
      "bg-gradient-to-l to-bgs1/80 from-bgs1 via-bgs1": parentBgIndex === 1,
      "bg-gradient-to-l to-bgs2/80 from-bgs2 via-bgs2": parentBgIndex === 2
    })}
  >
    {#if isHovering || isFocusing || $context.os === OperatingSystem.IOS}
      {#if !isFocusing && dev_isEnableDefaultSelection}
        <Button
          icon={isDefault ? "minus-circle" : "circle-dashed"}
          size={Size.sm}
          tooltip={isDefault ? "Remove default" : "Set as default"}
          on:click={(event) => {
            event.stopPropagation();
            if (isDefault) {
              dispatch("default", null);
            } else {
              dispatch("default", option.id);
            }
          }}
        />
      {/if}
      <Button
        icon="cross"
        size={Size.sm}
        tooltip={"Remove"}
        on:click={(event) => {
          event.stopPropagation();
          dispatch("remove", option.id);
        }}
      />
    {:else if isDefault && dev_isEnableDefaultSelection}
      <Badge text="default" size={Size.md} />
    {/if}
  </div>
</div>
