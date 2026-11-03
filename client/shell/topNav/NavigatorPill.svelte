<svelte:options runes={true} />

<script lang="ts">
  import { page } from "$app/stores";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
  import { Action } from "@nucleum/client/config/action.enum";
  import { accessTrailCount } from "@nucleum/shell/navigator/access-trail.store";
  import { resolveNavigatorLayer } from "@nucleum/shell/navigator/navigator-layer";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import { tooltip } from "@21n/ui/actions/popover.action";
  import NavigatorSearchInput from "@nucleum/shell/topNav/NavigatorSearchInput.svelte";
  import type { TopNavPanelActionState } from "@nucleum/shell/topNav/panel-actions";

  let {
    state = "idle"
  }: {
    /**
     * `idle` shows the "Jump to" pill, `compact` an icon beside another open
     * panel action, and `expanded` the navigator search input.
     */
    state?: TopNavPanelActionState;
  } = $props();

  const isActive = $derived(!!resolveNavigatorLayer($page.url));
  const trailCount = $derived($accessTrailCount);
</script>

{#if state === "expanded"}
  <div
    class="flex items-center w-full h-full px-3"
    data-testid="navigator-inline-search"
  >
    <NavigatorSearchInput />
  </div>
{:else if state === "compact"}
  <button
    type="button"
    data-testid="navigator-pill"
    aria-label="Open navigator"
    class="flex items-center justify-center h-full px-3.5 text-fgs2 hover:bg-bgs3-striped hover:text-fgs3"
    use:tooltip={{ text: "Jump to" }}
    onclick={() => requireCommandHost().runAction(Action.NAVIGATOR)}
  >
    <Icon icon="search" size={Size.md} />
  </button>
{:else}
  <div class="flex items-center h-full pl-1 pr-2">
    <button
      type="button"
      data-testid="navigator-pill"
      aria-label={trailCount > 0
        ? `Jump to, ${trailCount} items in trail`
        : "Jump to"}
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
        aria-hidden="true"
        class="flex items-center gap-1 px-1.5 h-5 rounded-full bg-bgs3 text-fgs3 font-mono"
        data-testid="navigator-pill-hint"
      >
        /{#if trailCount > 0}<span>&middot; {trailCount}</span>{/if}
      </span>
    </button>
  </div>
{/if}
