<script lang="ts">
  import type { PropertyConfigOption } from "$lib/client/types/memotron/type.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import ColorPicker from "$lib/client/elements/colorPicker/ColorPicker.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import Popover from "$lib/client/elements/popover/Popover.svelte";
  import ActiveBackgroundElement from "$lib/client/elements/style/ActiveBackgroundElement.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();
  export let option: PropertyConfigOption;
  export let isFocusing: boolean = false;
  export let isHovering: boolean = false;
  let textInputRef: any;
  if (isFocusing) textInputRef?.focus();
  onMount(() => {
    if (isFocusing) textInputRef?.focus();
  });
  if (!option.color) option.color = Math.random() * 360;
</script>

<div
  class={cn(
    "flex relative items-center gap-2 w-full rounded-md px-2 py-1.5 border",
    {
      "border-aps1": isFocusing,
      "border-brs3": !isFocusing
    }
  )}
  on:pointerenter={() => {
    isHovering = true;
  }}
  on:pointerleave={() => {
    isHovering = false;
  }}
>
  <Icon icon="bars" />
  <Popover
    triggerClass="flex items-center w-6 h-full"
    options={{
      class: "w-80 h-48 p-4",
      id: "colorpickerforoption"
    }}
  >
    <ActiveBackgroundElement
      isBackgroundActive={true}
      color={option.color}
      class="relative rounded-full h-5 w-5"
    >
      <ActiveBackgroundElement
        isBackgroundActive={true}
        color={option.color}
        class="absolute top-0.5 left-0.5 rounded-full h-4 w-4 border-[1.5px] border-brs2"
      />
    </ActiveBackgroundElement>
    <svelte:fragment slot="popover">
      <ColorPicker
        bind:hue={option.color}
        label={{ label: "Choose color", orientation: Orientation.Vertical }}
      />
    </svelte:fragment>
  </Popover>
  <TextInput
    bind:this={textInputRef}
    bind:value={option.label}
    style={InputStyle.PLAIN}
    placeholder="option..."
    on:enter={() => {
      textInputRef?.blur();
      dispatch("enter", option.id);
    }}
    on:focus={() => {
      isFocusing = true;
    }}
    on:blur={() => {
      isFocusing = false;
    }}
  />
  {#if isHovering || isFocusing}
    <div class="absolute flex items-center h-full right-0 mr-1">
      {#if !isFocusing}
        <Button
          icon="plus"
          size={Size.sm}
          tooltip={"Set as default"}
          on:click={(e) => {
            dispatch("default", option.id);
            e.stopPropagation();
          }}
        />
      {/if}
      <Button
        icon="cross"
        size={Size.sm}
        tooltip={"Remove"}
        on:click={(e) => {
          dispatch("remove", option.id);
          e.stopPropagation();
        }}
      />
    </div>
  {/if}
</div>
