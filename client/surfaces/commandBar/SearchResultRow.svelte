<script lang="ts">
  import { cn } from "@21n/ui/environment/presentation";
  import LinkSearchResultItem from "@nucleum/features/memory/common/linkbox/LinkSearchResultItem.svelte";
  import type { ResourceSearchHit } from "@nucleum/shared-state/resources/resource-search";

  let {
    hit,
    isActive = false,
    onSelect
  }: {
    hit: ResourceSearchHit;
    isActive?: boolean;
    onSelect: (event: MouseEvent) => void;
  } = $props();
  let ref = $state<HTMLElement | undefined>();

  $effect(() => {
    if (isActive && ref) ref.scrollIntoView({ block: "nearest" });
  });
</script>

<div
  bind:this={ref}
  data-testid="super-bar-result"
  data-active={isActive}
  class={cn("w-full flex items-center px-3 border-l-[3px] min-h-12", {
    "bg-bgs2 border-fgs1": isActive,
    "hover:bg-bgs2-striped border-transparent text-fgs2": !isActive
  })}
>
  <LinkSearchResultItem item={hit.record as any} onClick={onSelect} />
</div>
