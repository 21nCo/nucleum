<script lang="ts">
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
  import type { Product } from "@nucleum/client/config/product.type";
  import type { ISpaceNavItem } from "@nucleum/features/spaces/space.type";
  import SpaceItemPicker from "@nucleum/features/spaces/SpaceItemPicker.svelte";

  let {
    product,
    spaceId,
    focusChain,
    items,
    targetSection = undefined,
    hint,
    class: className = undefined,
    onClearTarget,
    onSelect,
    onAddSection
  }: {
    product: Product;
    spaceId: string;
    /** Spaces open above this one, from the root down. */
    focusChain: string[];
    items: ISpaceNavItem[];
    /** Section that picked records and new sections go into; the root when absent. */
    targetSection?: ISpaceNavItem;
    hint: string;
    class?: string;
    onClearTarget: () => void;
    /** Receives the picked record and the section it was picked for. */
    onSelect: (
      record: { id: string; label: string; avatar?: IAvatar },
      targetId: string | undefined
    ) => void;
    onAddSection: () => void;
  } = $props();
</script>

<section class={cn("flex flex-col gap-2", className)} aria-label="Add to space">
  {#if targetSection}
    <div class="flex items-center gap-1 text-b3 text-fgs2">
      <span class="truncate">Adding to {targetSection.label}</span>
      <button
        type="button"
        class="p-0.5 rounded hover:bg-bgs2-striped"
        aria-label="Add to the top level instead"
        onclick={onClearTarget}
      >
        <Icon icon="minus-circle" size={Size.xs} class="stroke-fgs3" />
      </button>
    </div>
  {/if}
  <SpaceItemPicker
    {product}
    currentSpaceId={spaceId}
    {focusChain}
    {items}
    targetLabel={targetSection?.label}
    targetId={targetSection?.id}
    {onSelect}
  />
  <button
    type="button"
    class="flex items-center gap-2 px-2 py-1.5 rounded-md text-b2 text-fgs2 hover:bg-bgs2-striped"
    data-testid="space-add-section"
    onclick={onAddSection}
  >
    <Icon icon="plus" size={Size.sm} class="stroke-fgs2" />
    {targetSection ? `Add section in ${targetSection.label}` : "Add section"}
  </button>
  <p class="text-b4 text-fgs3">{hint}</p>
</section>
