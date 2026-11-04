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
     * `idle` shows the "Search or jump to" pill, `compact` an icon beside another open
     * panel action, and `expanded` the navigator search input.
     */
    state?: TopNavPanelActionState;
  } = $props();

  const isActive = $derived(!!resolveNavigatorLayer($page.url));
  const trailCount = $derived($accessTrailCount);
  let pillRef = $state<HTMLButtonElement | undefined>(undefined);
  let searchRef = $state<HTMLDivElement | undefined>(undefined);
  let previousState: TopNavPanelActionState | undefined;
  let isRestoreFocus = false;

  $effect.pre(() => {
    const next = state;
    if (previousState === "expanded" && next !== "expanded") {
      isRestoreFocus = !!searchRef?.contains(document.activeElement);
    }
    previousState = next;
  });

  $effect(() => {
    void state;
    if (!isRestoreFocus || !pillRef) return;
    isRestoreFocus = false;
    pillRef.focus();
  });
</script>

{#if state === "expanded"}
  <div
    class="flex items-center w-full h-full"
    data-testid="navigator-inline-search"
    bind:this={searchRef}
  >
    <NavigatorSearchInput />
  </div>
{:else if state === "compact"}
  <button
    bind:this={pillRef}
    type="button"
    data-testid="navigator-pill"
    aria-label={trailCount > 0
      ? `Search or jump to, ${trailCount} items in trail`
      : "Search or jump to"}
    class="flex items-center justify-center h-full min-w-12 px-3.5 border-x border-transparent text-fgs2 hover:border-brs3 hover:bg-bgs3 hover:text-fgs1"
    use:tooltip={{ text: "Search or jump to" }}
    onclick={() => requireCommandHost().runAction(Action.NAVIGATOR)}
  >
    <Icon icon="search" size={Size.md} />
  </button>
{:else}
  <button
    bind:this={pillRef}
    type="button"
    data-testid="navigator-pill"
    aria-label={trailCount > 0
      ? `Search or jump to, ${trailCount} items in trail`
      : "Search or jump to"}
    aria-pressed={isActive}
    class={cn(
      "flex items-center justify-between gap-3 h-full w-64 px-3.5 border-x border-transparent hover:border-brs3 hover:bg-bgs3 text-b2 transition-colors",
      {
        "text-fgs3 hover:text-fgs1": !isActive,
        "text-aps1": isActive
      }
    )}
    onclick={() => requireCommandHost().runAction(Action.NAVIGATOR)}
  >
    <span class="flex items-center gap-2 min-w-0">
      <Icon icon="search" size={Size.sm} />
      <span class="truncate">Search or jump to&hellip;</span>
    </span>
    <span class="flex items-center gap-1 shrink-0">
      <span
        aria-hidden="true"
        class="px-1.5 py-0.5 rounded-sm bg-bgs3 text-b4 font-semibold text-fgs2"
        data-testid="navigator-pill-hint">/</span
      >
      {#if trailCount > 0}
        <span
          class="px-1.5 py-0.5 rounded-sm bg-aps3 text-b4 font-semibold text-aps1"
          aria-hidden="true">{trailCount}</span
        >
      {/if}
    </span>
  </button>
{/if}
