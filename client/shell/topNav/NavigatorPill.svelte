<svelte:options runes={true} />

<script lang="ts">
  import { page } from "$app/stores";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
  import { Action } from "@nucleum/client/config/action.enum";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { vTrail } from "@nucleum/shell/topNav/tabs/tabs.store";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";

  const isActive = $derived(
    $page.url.searchParams.get(AccessMode.PANEL) === Action.NAVIGATOR
  );
  const trailCount = $derived($vTrail.items.length);
</script>

<div class="flex items-center h-full pl-1 pr-2">
  <button
    type="button"
    data-testid="navigator-pill"
    aria-label="Open navigator"
    aria-pressed={isActive}
    class={cn(
      "flex items-center gap-2 h-8 pl-2.5 pr-1.5 rounded-full border text-b3 transition-colors",
      {
        "border-brs3 text-fgs3 hover:bg-bgs3 hover:text-fgs2": !isActive,
        "border-aps2 bg-aps3 text-aps1": isActive
      }
    )}
    onclick={() => requireCommandHost().runAction(Action.NAVIGATOR)}
  >
    <Icon icon="search" size={Size.sm} />
    <span class="whitespace-nowrap">Jump to&hellip;</span>
    <span
      class="flex items-center gap-1 px-1.5 h-5 rounded-full bg-bgs3 text-fgs3 font-mono"
      data-testid="navigator-pill-hint"
    >
      /{#if trailCount > 0}<span aria-label={`${trailCount} items in trail`}
          >&middot; {trailCount}</span
        >{/if}
    </span>
  </button>
</div>
