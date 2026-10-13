<svelte:options runes={true} />

<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import Button from "@21n/ui/elements/button/Button.svelte";

  import { Size } from "@21n/ui/elements/size.enum";
  let {
    item,
    isActive = false,
    isShowLabel = false,
    onClick
  }: {
    item: string;
    isActive?: boolean;
    isShowLabel?: boolean;
    onClick?: (event: MouseEvent) => void;
  } = $props();
  let component = requireCommandHost().resolveAction(item);
</script>

<div class="flex items-center gap-1">
  <Button
    icon={component?.icon}
    tooltip={component?.label}
    isStayActive={isActive}
    onclick={(event) => {
      onClick?.(event);
    }}
    size={isShowLabel ? Size.sm : Size.md}
  />
  {#if isShowLabel}
    <span class="text-b2 text-fgs2">
      {component?.label}
    </span>
  {/if}
</div>
