<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import type { IUniversalPropertyConfig } from "$lib/client/products/memotron/collection/properties/property.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { universalPropertyOptions } from "../../property.store";
  export let config: IUniversalPropertyConfig;
  export let onChange: (e: Partial<IUniversalPropertyConfig>) => void;
</script>

<div
  class="flex flex-col justify-between gap-4 h-80 p-3 bg-bgs1 border border-brs2 rounded-md"
>
  <div class="flex flex-col gap-2">
    {#each universalPropertyOptions as option}
      <button
        class={cn(
          "flex items-center gap-2 w-full justify-between p-2 rounded-md",
          {
            "cursor-not-allowed text-fgs3": config.type === option.value,
            "hover:bg-bgs2": config.type !== option.value
          }
        )}
        on:click={() => {
          if (config.type === option.value) return;
          config.type = option.value;
          onChange({ type: option.value });
        }}
      >
        <span class="flex items-center gap-2">
          <Icon
            icon={option.icon}
            size={Size.sm}
            class={config.type === option.value ? "text-fgs3" : "text-fgs1"}
          />
          <span class="text-b2">{option.label}</span>
        </span>
        {#if config.type === option.value}
          <Icon icon="ph:check-circle-light" size={Size.sm} />
        {/if}
      </button>
    {/each}
  </div>
  <div class="flex px-3">
    <SwitchInput
      label={{ label: "Allow multi selection" }}
      isExpanded={true}
      size={Size.sm}
      bind:checked={config.isMultiSelect}
      on:change={(e) => {
        onChange({ isMultiSelect: e.detail });
      }}
    />
  </div>
</div>
