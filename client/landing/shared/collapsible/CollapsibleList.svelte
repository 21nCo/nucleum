<script lang="ts">
  import CollapsibleItem from "@21n/landing/shared/collapsible/CollapsibleItem.svelte";
  export let items: Array<{ title: string; body: string }> = [];

  let expandedItems: Record<number, boolean> = {};

  function toggleItem(index: number) {
    expandedItems[index] = !expandedItems[index];
  }
</script>

<div class="w-full max-w-4xl mx-auto">
  <div class="rounded-lg overflow-hidden">
    {#each items as item, index}
      <CollapsibleItem
        title={item.title}
        body={item.body}
        isExpanded={!!expandedItems[index]}
        onToggle={() => toggleItem(index)}
      />
    {/each}
  </div>
</div>
