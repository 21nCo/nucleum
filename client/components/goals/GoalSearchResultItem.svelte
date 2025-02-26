<script lang="ts">
  import BreadcrumbMini from "$lib/client/elements/breadcrumb/BreadcrumbMini.svelte";
  import type { IGoalThumb } from "./goal.type";
  export let item: IGoalThumb;
  $: parentLabels = item.parent?.map((x) => x.label);
</script>

<div class="flex flex-col w-full items-start">
  {#if parentLabels}
    <BreadcrumbMini hierarchy={parentLabels} />
  {/if}
  <!-- TODO - task color if required -->
  {item.label}
</div>
