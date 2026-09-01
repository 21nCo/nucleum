<script lang="ts">
  import BreadcrumbMini from "@21n/elements/breadcrumb/BreadcrumbMini.svelte";
  import CustomColorPropagator from "@21n/elements/style/CustomColorPropagator.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  import { resolveGoalColor } from "@21n/components/goals/goal.utils";

  let { item }: { item: IGoalThumb } = $props();

  const parentLabels = $derived(
    item.parent ? item.parent.map((x) => x.label) : []
  );
  const color = $derived(resolveGoalColor(item));
</script>

<CustomColorPropagator
  {color}
  class={cn("flex flex-col w-full items-start text-left userdata", {
    "text-ccs1": color
  })}
>
  {#if parentLabels}
    <BreadcrumbMini hierarchy={parentLabels} />
  {/if}
  {item.label ? item.label : "Untitled"}
</CustomColorPropagator>
