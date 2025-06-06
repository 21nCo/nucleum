<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Orientation, Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { popover, TriggerMethod } from "$lib/client/actions/popover.action";
  import { cn } from "$lib/client/utils/ui.utils";
  import TypefaceDropdown from "./TypefaceDropdown.svelte";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";

  export let value: string;
  export let label: { label: string; orientation: Orientation };
  export let parentBackgroundIndex: number = 1;
  export let size: Size.md | Size.sm = Size.sm;

  type FontOption = {
    label: string;
    value: string;
    badge?: string;
  };

  const fontOptions: FontOption[] = [
    { label: "Sen", value: "Sen", badge: "Default" },
    { label: "Space Grotesk", value: "Space Grotesk" },
    { label: "Hanken Grotesk", value: "Hanken Grotesk" },
    { label: "Sora", value: "Sora" },
    { label: "Inter", value: "Inter" },
    { label: "Poppins", value: "Poppins" },
    { label: "Montserrat", value: "Montserrat" },
    { label: "Noto Sans", value: "Noto Sans" },
    { label: "Nunito", value: "Nunito" },
    { label: "Teachers", value: "Teachers" }
  ];

  const dispatch = createEventDispatcher();

  let isOpen = false;
  let triggerRef: HTMLButtonElement;
  let selectedFont =
    fontOptions.find((font) => font.value === value) || fontOptions[0];

  function handleFontSelect(selectedValue: string) {
    const font = fontOptions.find((f) => f.value === selectedValue);
    if (font) {
      selectedFont = font;
      value = font.value;
      dispatch("select", font.value);
    }
  }

  /**
   * Handle change event from popover action
   * popover.action.ts dispatches a change event with detail.open when the popover visibility changes
   */
  function handleChange(event: Event) {
    // Access detail property safely with type assertion
    const customEvent = event as { detail?: { open: boolean } };
    if (customEvent.detail) {
      isOpen = customEvent.detail.open;
    }
  }
</script>

<div class="relative flex flex-col gap-1">
  {#if label?.label}
    <FormControlLabel props={label} />
  {/if}
  <button
    bind:this={triggerRef}
    class={cn(
      "relative flex justify-between items-center bg-bgs1 border border-brs3 rounded-md px-3 py-2 text-fgs1 w-full",
      {
        "text-sm": size === Size.sm
      }
    )}
    use:popover={{
      content: TypefaceDropdown,
      placement: Placement.BottomCenter,
      isSpanToTriggerWidth: true,
      id: "typeface-selector-popover",
      componentProps: {
        fontOptions,
        selectedValue: selectedFont.value,
        size,
        onSelect: handleFontSelect
      }
    }}
    on:change={handleChange}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
  >
    <span style="font-family: '{selectedFont.value}'">
      {selectedFont.label}
    </span>
    <Icon
      icon={isOpen ? "ph:caret-up-light" : "ph:caret-down-light"}
      size={Size.sm}
    />
  </button>
</div>
