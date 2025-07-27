<script lang="ts">
  import BreadcrumbMini from "$lib/client/elements/breadcrumb/BreadcrumbMini.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IGoalThumb } from "./goal.type";
  import { resolveGoalColor } from "./goal.utils";
  export let item: IGoalThumb;
  $: parentLabels = item.parent ? item.parent.map((x) => x.label) : [];
  $: color = resolveGoalColor(item);
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
