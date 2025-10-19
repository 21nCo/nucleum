<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import type { PricingToggleOption } from "@21n/landing/shared/pricing/pricing.types";
  export let unit: PricingToggleOption;

  let options: { value: PricingToggleOption; label: string }[] = [
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
    { value: "lifetime", label: "Life time" }
  ];

  let className: string = "";
  export { className as class };

  function selectOption(option: PricingToggleOption) {
    unit = option;
  }
</script>

<div class={cn("inline-flex items-center bg-bgs3 rounded-lg p-1", className)}>
  {#each options as option}
    <button
      class={cn("px-4 py-2 text-sm rounded-md transition-all", {
        "bg-bgs1 shadow-sm": unit === option.value,
        "text-fgs3 hover:text-fgs2": unit !== option.value
      })}
      on:click={() => selectOption(option.value)}
    >
      {option.label}
      {#if option.value === "yearly"}
        <span class="text-fgs3 text-b4">(20% off)</span>
      {/if}
    </button>
  {/each}
</div>
