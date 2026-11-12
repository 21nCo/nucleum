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

  let isListOpen = $state(false);
  let isHovered = $state(false);

  const latest = $derived($toasts[$toasts.length - 1]);
  const isLatestDismissable = $derived(
    Boolean(
      latest && !latest.isNonDismissable && latest.type !== AlertType.PROGRESS
    )
  );
  const pausedIds = $derived(
    isListOpen || isHovered ? $toasts.map((toast) => toast.id) : []
  );

  $effect(() => {
    if ($toasts.length < 2) isListOpen = false;
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
  use:topBarDropdown={{
    isOpen: isListOpen,
    onDismiss: () => (isListOpen = false)
  }}
  class="relative flex items-stretch justify-end h-full pr-3 text-b2 min-w-0"
  data-testid="top-bar-toasts"
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
    onpointerenter={() => {
      isHovered = true;
    }}
    onpointerleave={() => {
      isHovered = false;
    }}
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
            { "opacity-0 focus-visible:opacity-100": !isHovered }
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
      class="absolute right-0 top-full mt-1 z-[60] w-96 max-h-96 overflow-auto flex flex-col gap-1 p-2 rounded-md border border-brs3 bg-bgs1 shadow-lg"
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
