<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import ColorPicker from "$lib/client/elements/colorPicker/ColorPicker.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher, onMount } from "svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import type { IPropertyConfigOption } from "../../property.type";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";
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
    onHover: (e) => (isHovering = e)
  }}
>
  <span class="cursor-move h-full flex flex-col items-center justify-center">
    <Icon icon="dots-six-vertical" class="stroke-fgs3" />
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
    on:keydown={(e) => {
      if (e.key === "Escape") {
        textInputRef?.blur();
        e.stopPropagation();
      }
    }}
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
          on:click={(e) => {
            if (isDefault) {
              dispatch("default", null);
            } else {
              dispatch("default", option.id);
            }
            e.detail?.stopPropagation();
          }}
        />
      {/if}
      <Button
        icon="cross"
        size={Size.sm}
        tooltip={"Remove"}
        on:click={(e) => {
          dispatch("remove", option.id);
          e.detail?.stopPropagation();
        }}
      />
    {:else if isDefault && dev_isEnableDefaultSelection}
      <Badge text="default" size={Size.md} />
    {/if}
  </div>
</div>
