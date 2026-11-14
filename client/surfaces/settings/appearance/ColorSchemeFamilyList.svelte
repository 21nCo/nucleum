<script lang="ts">
  import {
    groupColorSchemeFamilies,
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
    onSelect
  }: {
    families: ResolvedColorSchemeFamily[];
    selectedFamilyId?: string | undefined;
    variant?: "both" | "light" | "dark";
    onSelect: (family: ResolvedColorSchemeFamily) => void;
  } = $props();

  let query = $state("");
  let container = $state<HTMLDivElement | undefined>();

  const available = $derived.by(() => {
    if (variant === "both") return families;
    const seen = new Set<string>();
    return families.filter((family) => {
      const id = variant === "light" ? family.lightId : family.darkId;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  });

  function resolveLabel(family: ResolvedColorSchemeFamily) {
    const scheme = variant === "light" ? family.light : family.dark;
    if (variant === "both" || !scheme?.label) return family.label;
    return scheme.label.charAt(0).toUpperCase() + scheme.label.slice(1);
  }
  const groups = $derived(groupColorSchemeFamilies(available, query));

  $effect(() => {
    container?.querySelector("input")?.focus();
  });
</script>

<div
  bind:this={container}
  class="flex flex-col w-full max-h-[26rem] bg-bgs1 border border-brs3 rounded-md overflow-hidden"
  data-testid="color-scheme-family-list"
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
  <div class="flex flex-col overflow-y-auto py-1" role="listbox">
    {#each groups as group (group.category)}
      <div
        class="px-3 pt-3 pb-1 text-b4 font-medium uppercase tracking-wide text-fgs3"
        role="presentation"
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
          <span class="flex-1 truncate text-fgs1">{resolveLabel(family)}</span>
        </button>
      {/each}
    {:else}
      <div class="px-3 py-4 text-b2 text-fgs3">No colour schemes found</div>
    {/each}
  </div>
</div>
