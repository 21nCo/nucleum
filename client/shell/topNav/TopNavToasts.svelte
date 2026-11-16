<svelte:options runes={true} />

<script lang="ts">
  import { topBarDropdown } from "@nucleum/shell/topNav/top-bar-dropdown";
  import { fly } from "svelte/transition";
  import { quadIn } from "svelte/easing";
  import { toasts } from "@nucleum/shared-state/notifications/notification.store";
  import { AlertType } from "@nucleum/shared-state/notifications/notification.type";
  import ToastNotificationContent from "@nucleum/shell/notifications/ToastNotificationContent.svelte";
  import { cn } from "@21n/ui/environment/presentation";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { tick } from "svelte";

  let {
    isRaised = false
  }: {
    /** Shown in the host raised above a modal, which anchors and bounds the list. */
    isRaised?: boolean;
  } = $props();

  let isListOpen = $state(false);
  let isHovered = $state(false);
  let isFocused = $state(false);
  let root = $state<HTMLElement | undefined>();

  const latest = $derived($toasts[$toasts.length - 1]);
  const isLatestDismissable = $derived(
    Boolean(
      latest && !latest.isNonDismissable && latest.type !== AlertType.PROGRESS
    )
  );
  const isEngaged = $derived(isListOpen || isHovered || isFocused);
  const pausedIds = $derived(isEngaged ? $toasts.map((toast) => toast.id) : []);

  $effect(() => {
    if ($toasts.length < 2) isListOpen = false;
  });

  /** Whether `element` shows keyboard focus, which pauses the toasts like hover does. */
  function isKeyboardFocused(element: Element | null) {
    try {
      return Boolean(element?.matches(":focus-visible"));
    } catch {
      return false;
    }
  }

  /** Ends the focus pause once keyboard focus has left the toasts, including when the focused toast was removed. */
  function syncFocus() {
    const active = document.activeElement;
    isFocused = Boolean(root?.contains(active)) && isKeyboardFocused(active);
  }

  $effect(() => {
    void $toasts;
    if (!isFocused) return;
    tick().then(syncFocus);
  });

  function toggleList() {
    if ($toasts.length > 1) isListOpen = !isListOpen;
  }

  $effect(() => {
    const ids = pausedIds;
    if (!ids.length) return;
    toasts.pause(ids);
    return () => toasts.resume(ids);
  });
</script>

<div
  bind:this={root}
  use:topBarDropdown={{
    isOpen: isListOpen,
    onDismiss: () => (isListOpen = false),
    isEscapeContained: true
  }}
  class={cn("flex items-stretch justify-end h-full pr-3 text-b2 min-w-0", {
    relative: !isRaised
  })}
  data-testid="top-bar-toasts"
  role="presentation"
  onpointerenter={() => {
    isHovered = true;
  }}
  onpointerleave={() => {
    isHovered = false;
  }}
  onfocusin={(event) => {
    isFocused = isKeyboardFocused(event.target as Element | null);
  }}
  onfocusout={(event) => {
    if (!root?.contains(event.relatedTarget as Node | null)) isFocused = false;
  }}
  in:fly={{ duration: 200, y: -10, easing: quadIn }}
>
  {#if $toasts.length > 1}
    <button
      type="button"
      class="group/count flex items-center pl-2 pr-2"
      aria-label={`${$toasts.length} notifications`}
      aria-expanded={isListOpen}
      data-testid="top-bar-toast-count"
      onclick={toggleList}
    >
      <span
        class={cn(
          "flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full text-b3 font-medium border border-brs3 group-hover/count:bg-bgs3",
          { "bg-bgs3": isListOpen }
        )}
      >
        {$toasts.length}
      </span>
    </button>
  {/if}
  <div
    aria-live="polite"
    class={cn("flex items-stretch gap-1 min-w-0", {
      "pl-2": $toasts.length < 2
    })}
    data-testid="top-bar-toast-latest"
    role="group"
  >
    {#if latest}
      {#key latest.id}
        <button
          type="button"
          class={cn("flex items-center min-w-0 truncate text-left", {
            "cursor-default": $toasts.length < 2
          })}
          aria-expanded={$toasts.length > 1 ? isListOpen : undefined}
          onclick={toggleList}
        >
          <ToastNotificationContent notification={latest} />
        </button>
      {/key}
      {#if isLatestDismissable}
        <button
          type="button"
          class={cn(
            "flex items-center justify-center self-center w-6 h-6 shrink-0 rounded-md hover:bg-bgs3 transition-opacity",
            { "opacity-0 focus-visible:opacity-100": !isEngaged }
          )}
          aria-label="Dismiss notification"
          data-testid="top-bar-toast-dismiss"
          onclick={() => toasts.dismiss(latest.id)}
        >
          <Icon icon="cross" size={Size.xs} />
        </button>
      {/if}
    {/if}
  </div>
  {#if isListOpen}
    <div
      class={cn(
        "absolute top-full mt-1 z-[60] w-96 max-h-96 overflow-auto flex flex-col gap-1 p-2 rounded-md border border-brs3 bg-bgs1 shadow-lg",
        isRaised
          ? "left-1/2 -translate-x-1/2 max-w-[calc(100%-1rem)]"
          : "right-0"
      )}
      data-testid="top-bar-toast-list"
    >
      {#each [...$toasts].reverse() as toast (toast.id)}
        <div
          class="flex items-start justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-bgs2"
        >
          <ToastNotificationContent notification={toast} />
          <button
            type="button"
            class="text-b3 text-fgs3 hover:text-fgs1 shrink-0"
            aria-label="Dismiss notification"
            onclick={() => toasts.dismiss(toast.id)}
          >
            Dismiss
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
