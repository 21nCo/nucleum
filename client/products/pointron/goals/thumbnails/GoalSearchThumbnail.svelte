<script lang="ts">
  import BreadcrumbMini from "$lib/client/elements/breadcrumb/BreadcrumbMini.svelte";
  import TextWithHoverTooltip from "$lib/client/elements/text/TextWithHoverTooltip.svelte";
  export let item: any;
</script>

<div class="flex flex-col w-full items-start">
  {#if item.parent?.hierarchy}
    <BreadcrumbMini hierarchy={item.parent.hierarchy.map((x) => x.label)} />
  {/if}
  <TextWithHoverTooltip
    text={item.label}
    class="text-left truncate w-full max-w-full"
  />
</div>
