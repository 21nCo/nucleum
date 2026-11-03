<svelte:options runes={true} />

<script lang="ts">
  import { fly } from "svelte/transition";
  import { quadIn } from "svelte/easing";
  import { toasts } from "@nucleum/shared-state/notifications/notification.store";
  import ToastNotificationContent from "@nucleum/shell/notifications/ToastNotificationContent.svelte";
  import { cn } from "@21n/ui/environment/presentation";

  const HOVER_DISMISS_DISTANCE_PX = 4;

  let isListOpen = $state(false);
  let hoverOrigin = $state<{ x: number; y: number } | undefined>(undefined);
  let containerRef = $state<HTMLDivElement | undefined>(undefined);

  const latest = $derived($toasts[$toasts.length - 1]);

  $effect(() => {
    if ($toasts.length < 2) isListOpen = false;
  });

  function handlePointerMove(event: PointerEvent) {
    if (isListOpen || !latest || event.pointerType === "touch") return;
    if (!hoverOrigin) {
      hoverOrigin = { x: event.clientX, y: event.clientY };
      return;
    }
    const distance = Math.hypot(
      event.clientX - hoverOrigin.x,
      event.clientY - hoverOrigin.y
    );
    if (distance < HOVER_DISMISS_DISTANCE_PX) return;
    hoverOrigin = undefined;
    toasts.dismiss(latest.id);
  }

  function handleWindowPointerDown(event: PointerEvent) {
    if (!isListOpen || !containerRef) return;
    if (event.target instanceof Node && containerRef.contains(event.target))
      return;
    isListOpen = false;
  }

  /** Closes on Escape, and on keys pressed outside it, such as a shortcut that opens a modal. */
  function handleWindowKeyDown(event: KeyboardEvent) {
    if (!isListOpen) return;
    const isInside =
      !!containerRef &&
      event.target instanceof Node &&
      containerRef.contains(event.target);
    if (event.key === "Escape" || !isInside) isListOpen = false;
  }
</script>

<svelte:window
  onpointerdown={handleWindowPointerDown}
  onkeydown={handleWindowKeyDown}
/>

<div
  bind:this={containerRef}
  class="relative flex items-center justify-end gap-2 h-full pr-3 pl-2 text-b2 min-w-0"
  data-testid="top-bar-toasts"
  in:fly={{ duration: 200, y: -10, easing: quadIn }}
>
  {#if $toasts.length > 1}
    <button
      type="button"
      class={cn(
        "flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full text-b3 font-medium border border-brs3 hover:bg-bgs3",
        { "bg-bgs3": isListOpen }
      )}
      aria-label={`${$toasts.length} notifications`}
      aria-expanded={isListOpen}
      data-testid="top-bar-toast-count"
      onclick={() => {
        isListOpen = !isListOpen;
      }}
    >
      {$toasts.length}
    </button>
  {/if}
  {#if latest}
    {#key latest.id}
      <button
        type="button"
        aria-live="polite"
        class="flex items-center min-w-0 truncate cursor-default text-left"
        onpointerleave={() => {
          hoverOrigin = undefined;
        }}
        onpointermove={handlePointerMove}
        onclick={() => {
          if ($toasts.length > 1) isListOpen = !isListOpen;
        }}
      >
        <ToastNotificationContent notification={latest} />
      </button>
    {/key}
  {/if}
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
