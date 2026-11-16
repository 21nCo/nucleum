<script lang="ts">
  import {
    colorSchemeVariantLabel,
    type ColorSchemeVariant,
    type ResolvedColorSchemeFamily
  } from "@21n/theme/colorscheme-catalog";
  import { popover } from "@21n/ui/actions/popover.action";
  import { Placement } from "@21n/ui/elements/direction.enum";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import FormControlLabel from "@21n/ui/elements/text/formLabel/FormControlLabel.svelte";
  import { Orientation } from "@21n/ui/elements/direction.enum";
  import ColorSchemeFamilyList from "@nucleum/surfaces/settings/appearance/ColorSchemeFamilyList.svelte";
  import ColorSchemeSwatch from "@nucleum/surfaces/settings/appearance/ColorSchemeSwatch.svelte";

  let {
    label,
    families,
    selected,
    variant = "both",
    testId = "color-scheme-family-picker",
    onSelect
  }: {
    label: string;
    families: ResolvedColorSchemeFamily[];
    selected: ResolvedColorSchemeFamily | undefined;
    variant?: ColorSchemeVariant;
    testId?: string;
    onSelect: (family: ResolvedColorSchemeFamily) => void;
  } = $props();

  let trigger = $state<HTMLButtonElement | undefined>();
  let isOpen = $state(false);

  const displayLabel = $derived(
    selected ? colorSchemeVariantLabel(selected, variant) : "Custom"
  );

  $effect(() => {
    const node = trigger;
    if (!node) return;
    const onChange = (event: Event) => {
      isOpen = !!(event as CustomEvent<{ open: boolean }>).detail?.open;
    };
    node.addEventListener("change", onChange);
    return () => node.removeEventListener("change", onChange);
  });

  function close() {
    trigger?.dispatchEvent(new CustomEvent("hide"));
    trigger?.focus();
  }

  function pick(family: ResolvedColorSchemeFamily) {
    onSelect(family);
    close();
  }
</script>

<div class="flex flex-col gap-2 w-full">
  <div id={`${testId}-label`}>
    <FormControlLabel props={{ label, orientation: Orientation.Vertical }} />
  </div>
  <button
    bind:this={trigger}
    type="button"
    data-testid={testId}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    aria-controls={isOpen ? `${testId}-popover` : undefined}
    aria-labelledby={`${testId}-label ${testId}-value`}
    class="flex items-center gap-3 w-full px-3 py-2 rounded-md border border-brs3 bg-bgs1 text-left text-b2 hover:bg-bgs2"
    use:popover={{
      content: ColorSchemeFamilyList,
      placement: Placement.BottomCenter,
      isSpanToTriggerWidth: true,
      id: `${testId}-popover`,
      componentProps: {
        families,
        selectedFamilyId: selected?.id,
        variant,
        label,
        idPrefix: testId,
        onSelect: pick,
        onClose: close
      }
    }}
  >
    <span class="flex items-center gap-1.5">
      {#if variant !== "dark"}
        <ColorSchemeSwatch scheme={selected?.light} />
      {/if}
      {#if variant !== "light"}
        <ColorSchemeSwatch scheme={selected?.dark} />
      {/if}
    </span>
    <span id={`${testId}-value`} class="flex-1 truncate text-fgs1">
      {displayLabel}
    </span>
    {#if selected}
      <span class="text-b3 text-fgs3">{selected.category}</span>
    {/if}
    <Icon icon="chevron-down" size={Size.sm} />
  </button>
</div>
