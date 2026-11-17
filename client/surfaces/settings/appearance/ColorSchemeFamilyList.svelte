<script lang="ts">
  import {
    colorSchemeVariantFamilies,
    colorSchemeVariantLabel,
    groupColorSchemeFamilies,
    type ColorSchemeVariant,
    type ResolvedColorSchemeFamily
  } from "@21n/theme/colorscheme-catalog";
  import TextInput from "@21n/ui/elements/input/TextInput.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import ColorSchemeSwatch from "@nucleum/surfaces/settings/appearance/ColorSchemeSwatch.svelte";

  let {
    families,
    selectedFamilyId = undefined,
    variant = "both",
    label = "Colour scheme",
    idPrefix = "color-scheme",
    onSelect,
    onClose = undefined
  }: {
    families: ResolvedColorSchemeFamily[];
    selectedFamilyId?: string | undefined;
    variant?: ColorSchemeVariant;
    label?: string;
    idPrefix?: string;
    onSelect: (family: ResolvedColorSchemeFamily) => void;
    onClose?: () => void;
  } = $props();

  let query = $state("");
  let container = $state<HTMLDivElement | undefined>();

  const available = $derived(colorSchemeVariantFamilies(families, variant));
  const groups = $derived(groupColorSchemeFamilies(available, query, variant));

  $effect(() => {
    container?.querySelector("input")?.focus();
  });

  function optionToFocus(key: string, target: EventTarget | null) {
    const options = Array.from(
      container?.querySelectorAll<HTMLElement>('[role="option"]') ?? []
    );
    const index = options.indexOf(target as HTMLElement);
    if (key === "ArrowDown") {
      return options[Math.min(index + 1, options.length - 1)];
    }
    if (index < 0) return undefined;
    if (key === "ArrowUp") {
      return index === 0
        ? container?.querySelector("input")
        : options[index - 1];
    }
    if (key === "Home") return options[0];
    if (key === "End") return options.at(-1);
    return undefined;
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
      return;
    }
    const next = optionToFocus(event.key, event.target);
    if (!next) return;
    event.preventDefault();
    next.focus();
  }
</script>

<div
  bind:this={container}
  class="flex flex-col w-full max-h-[26rem] bg-bgs1 border border-brs3 rounded-md overflow-hidden"
  data-testid="color-scheme-family-list"
  role="presentation"
  onkeydown={onKeydown}
>
  <div class="p-2 border-b border-brs3">
    <TextInput
      bind:value={query}
      placeholder="Search colour schemes"
      size={Size.sm}
      isPreventKeyboardToolbar={true}
      testId="color-scheme-search"
    />
  </div>
  <div
    class="flex flex-col overflow-y-auto py-1"
    role="listbox"
    aria-label={label}
  >
    {#each groups as group (group.category)}
      {@const headingId = `${idPrefix}-group-${group.category}`}
      <div role="group" aria-labelledby={headingId}>
        <div
          id={headingId}
          class="px-3 pt-3 pb-1 text-b4 font-medium uppercase tracking-wide text-fgs3"
        >
          {group.category}
        </div>
        {#each group.families as family (family.id)}
          {@const isSelected = family.id === selectedFamilyId}
          <button
            type="button"
            role="option"
            aria-selected={isSelected}
            data-testid="color-scheme-family-option"
            data-family-id={family.id}
            class={cn(
              "flex items-center gap-3 w-full px-3 py-2 text-left text-b2",
              {
                "bg-bgs3": isSelected,
                "hover:bg-bgs2": !isSelected
              }
            )}
            onclick={() => onSelect(family)}
          >
            <span class="flex items-center gap-1.5">
              {#if variant !== "dark"}
                <ColorSchemeSwatch scheme={family.light} />
              {/if}
              {#if variant !== "light"}
                <ColorSchemeSwatch scheme={family.dark} />
              {/if}
            </span>
            <span class="flex-1 truncate text-fgs1"
              >{colorSchemeVariantLabel(family, variant)}</span
            >
          </button>
        {/each}
      </div>
    {:else}
      <div class="px-3 py-4 text-b2 text-fgs3">No colour schemes found</div>
    {/each}
  </div>
</div>
