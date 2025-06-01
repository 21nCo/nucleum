<script lang="ts">
  import BreadcrumbMini from "$lib/client/elements/breadcrumb/BreadcrumbMini.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import type { IGoalThumb } from "./goal.type";
  import { resolveGoalColor } from "./goal.utils";
  export let item: IGoalThumb;
  $: parentLabels = item.parent?.map((x) => x.label);
  $: color = resolveGoalColor(item);
</script>

<CustomColorPropagator
  {color}
  class="flex flex-col w-full items-start text-ccs1 text-left userdata"
>
  {#if parentLabels}
    <BreadcrumbMini hierarchy={parentLabels} />
  {/if}
  <!-- TODO - task color if required -->
  {item.label ? item.label : "Untitled"}
</CustomColorPropagator>
