<script lang="ts">
  import BreadcrumbMini from "$lib/client/elements/breadcrumb/BreadcrumbMini.svelte";
  import type { ITaskThumb } from "./task.type";
  export let item: ITaskThumb;
  $: parentLabels = item.parent?.map((x) => x.label);
  $: console.log({ item, parentLabels });
</script>

<div class="flex flex-col w-full items-start">
  {#if parentLabels}
    <BreadcrumbMini hierarchy={parentLabels} />
  {/if}
  <!-- TODO - task color if required -->
  {item.label}
</div>
