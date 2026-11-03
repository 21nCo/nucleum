<script lang="ts">
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import type { ISpacePageNavItem } from "@nucleum/features/spaces/space.type";
  import { resolveSpacePageStatus } from "@nucleum/features/spaces/space.utils";
  import {
    openSpacePage,
    resolveOpenableSpacePage
  } from "@nucleum/features/spaces/space-page";
  import type { ISpaceWallContext } from "@nucleum/features/spaces/wall/space-wall.type";

  let {
    item,
    wall
  }: {
    item: ISpacePageNavItem;
    wall: ISpaceWallContext;
  } = $props();

  const route = $derived(resolveOpenableSpacePage(item.path));
  const status = $derived(resolveSpacePageStatus(route));
  const label = $derived(route?.label || item.label || item.path);

  function open() {
    if (status) return;
    openSpacePage(item);
  }
</script>

<li
  class="relative flex flex-col min-w-0"
  data-id={item.id}
  data-testid="space-wall-card"
  data-page-path={item.path}
>
  <button
    type="button"
    class={cn(
      "flex items-center gap-3 w-full p-3 rounded-md border border-brs2 bg-bgs2 text-left",
      {
        "cursor-not-allowed": Boolean(status),
        "notouch:hover:border-brs4": !status
      }
    )}
    aria-disabled={status ? "true" : undefined}
    title={status?.text}
    onclick={open}
  >
    <span
      class={cn(
        "flex w-8 h-8 shrink-0 items-center justify-center rounded-md bg-bgs3",
        { "opacity-50": Boolean(status) }
      )}
    >
      <Icon
        icon={route?.action.icon ?? "link"}
        size={Size.sm}
        class="stroke-fgs2"
      />
    </span>
    <span class="flex flex-col min-w-0">
      <span class={cn("truncate text-b2", { "text-fgs3": Boolean(status) })}>
        {label}
      </span>
      {#if status}
        <span class="text-b4 text-fgs3">{status.text}</span>
      {/if}
    </span>
  </button>
  {#if wall.isEditMode}
    <button
      type="button"
      class="absolute -top-2 -left-2 z-10 flex items-center justify-center w-7 h-7 rounded-full border border-brs2 bg-bgs1 shadow-sm notouch:hover:bg-bgs2"
      aria-label={`Remove ${label}`}
      title="Remove from space"
      data-testid="space-wall-remove"
      onclick={(event) => {
        event.stopPropagation();
        wall.onDelete(item, label);
      }}
    >
      <Icon icon="trash" size={Size.sm} class="stroke-ars1" />
    </button>
  {/if}
</li>
