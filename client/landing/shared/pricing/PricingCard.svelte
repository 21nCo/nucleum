<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import Button from "../elements/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { PricingPlan, PricingToggleOption } from "./pricing.types";
  export let plan: PricingPlan;
  export let unit: PricingToggleOption;
</script>

<div class={cn("border border-brs3 rounded-lg p-6 flex flex-col")}>
  <div class="mb-6">
    <SvgIcon icon={plan.icon} size={Size.lg} />
  </div>

  <h3 class="text-h2 font-medium mb-1">{plan.title}</h3>
  <p class="text-fgs3 mb-6 text-sm">{plan.subtitle}</p>

  <div class="flex items-baseline mb-6">
    <span class="text-3xl font-bold">
      ${typeof plan.price === "number" ? plan.price : plan.price[unit]}
    </span>
    {#if plan.id !== "free"}
      <span class="text-fgs3 ml-1 text-sm">
        /
        {#if plan.unit}
          {plan.unit}
        {:else if unit}
          {unit}
        {/if}
      </span>
    {/if}
  </div>

  <div class="flex-grow">
    <ul class="space-y-3 mb-6">
      {#each plan.features as feature}
        <li class="flex items-start">
          <span class="text-green-500 mt-1 mr-2">
            <SvgIcon
              icon={feature.icon ? feature.icon : "check"}
              size={Size.sm}
            />
          </span>
          <span class="text-sm">{feature.text}</span>
        </li>
      {/each}
    </ul>
  </div>

  <div class="mt-auto">
    <Button
      type={plan.id === "free" ? "secondary" : "primary"}
      label={plan.ctaText}
    />
  </div>
  {#if plan.id !== "free"}
    <span class="flex text-fgs4 text-b3 mt-3">Includes 1 month free trial</span>
  {/if}
</div>
