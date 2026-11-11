<script lang="ts">
  import type { ResolvedColorSchemeFamily } from "@21n/theme/colorscheme-catalog";
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
    variant?: "both" | "light" | "dark";
    testId?: string;
    onSelect: (family: ResolvedColorSchemeFamily) => void;
  } = $props();

  let openKey = $state(0);

  const displayLabel = $derived.by(() => {
    if (!selected) return "Custom";
    const scheme = variant === "light" ? selected.light : selected.dark;
    if (variant === "both" || !scheme?.label) return selected.label;
    return scheme.label.charAt(0).toUpperCase() + scheme.label.slice(1);
  });

  function pick(family: ResolvedColorSchemeFamily) {
    openKey += 1;
    onSelect(family);
  }
</script>

<div class="flex flex-col gap-2 w-full">
  <FormControlLabel props={{ label, orientation: Orientation.Vertical }} />
  {#key openKey}
    <button
      type="button"
      data-testid={testId}
      aria-haspopup="listbox"
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
          onSelect: pick
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
      <span class="flex-1 truncate text-fgs1">
        {displayLabel}
      </span>
      {#if selected}
        <span class="text-b3 text-fgs3">{selected.category}</span>
      {/if}
      <Icon icon="chevron-down" size={Size.sm} />
    </button>
  {/key}
</div>
