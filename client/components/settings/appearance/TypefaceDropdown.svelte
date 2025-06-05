<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import Badge from "$lib/client/elements/text/Badge.svelte";

  type FontOption = {
    label: string;
    value: string;
    badge?: string;
  };

  export let fontOptions: FontOption[] = [];
  export let selectedValue: string;
  export let size: Size.md | Size.sm = Size.sm;
  export let onSelect: (value: string) => void;

  function handleSelect(value: string) {
    if (onSelect) {
      onSelect(value);
    }
  }
</script>

<div class="w-full max-h-60 overflow-y-auto bg-bgs1">
  {#each fontOptions as font}
    <button
      class={cn(
        "w-full text-left px-3 py-2 flex justify-between items-center",
        {
          "bg-bgs2": font.value === selectedValue,
          "hover:bg-bgs2": font.value !== selectedValue,
          "text-b2": size === Size.sm,
          "font-[401]": font.value === "Space Grotesk"
        }
      )}
      style="font-family: '{font.value}'"
      on:click={() => handleSelect(font.value)}
      role="option"
      aria-selected={font.value === selectedValue}
    >
      <span>{font.label}</span>
      {#if font.badge}
        <Badge text={font.badge} />
      {/if}
    </button>
  {/each}
</div>
