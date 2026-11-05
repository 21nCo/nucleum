<svelte:options runes={true} />

<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { get } from "svelte/store";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { tooltip } from "@21n/ui/actions/popover.action";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { navigatorSearch } from "@nucleum/shell/navigator/navigator-search";
  import { navigatorFocusRequests } from "@nucleum/shell/navigator/navigator-focus";
  import { resolveNavigatorLayer } from "@nucleum/shell/navigator/navigator-layer";

  const query = navigatorSearch.query;
  let inputRef = $state<HTMLInputElement | undefined>(undefined);
  const initialFocusRequests = get(navigatorFocusRequests);

  onMount(() => {
    const release = navigatorSearch.hostInline();
    inputRef?.focus();
    return release;
  });

  $effect(() => {
    if ($navigatorFocusRequests === initialFocusRequests) return;
    untrack(() => inputRef?.focus());
  });
</script>

<div
  class="flex items-center w-full h-full gap-2 pl-3 pr-2 text-b3 focus-within:shadow-[inset_0_-2px_0_0_rgb(var(--colors-aps1))]"
>
  <Icon icon="search" size={Size.sm} class="shrink-0 stroke-fgs3" />
  <input
    bind:this={inputRef}
    bind:value={$query}
    type="text"
    placeholder="Search or jump to..."
    aria-label="Search the navigator"
    data-testid="navigator-search-input"
    class="flex-1 min-w-0 h-full bg-transparent outline-none text-fgs1 placeholder:text-fgs3"
    onkeydown={(event) => {
      if (navigatorSearch.keydown(event)) event.stopPropagation();
    }}
  />
  <button
    type="button"
    aria-label="Close navigator"
    data-testid="navigator-inline-close"
    class="flex items-center justify-center h-6 w-6 shrink-0 rounded-full text-fgs3 hover:bg-bgs3 hover:text-fgs1"
    use:tooltip={{ text: "Close (Esc)" }}
    onclick={() =>
      navigation.toggleSearchParam([
        resolveNavigatorLayer(new URL(window.location.href)) ?? AccessMode.PANEL
      ])}
  >
    <Icon icon="cross" size={Size.xs} />
  </button>
</div>
