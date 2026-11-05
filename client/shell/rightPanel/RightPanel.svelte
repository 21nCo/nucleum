<script lang="ts">
  import { cn } from "@21n/ui/environment/presentation";
  import { requireActionRenderer } from "@nucleum/shared-state/resources/action-renderer";
  import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import context from "@nucleum/client/runtime/context.store";
  import { fly } from "svelte/transition";
  import { quadInOut } from "svelte/easing";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { focusTrap } from "@21n/ui/actions/focus-trap.action";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { untrack } from "svelte";
  import { writable } from "svelte/store";
  import { provideRightPanelVisibility } from "@nucleum/shell/rightPanel/right-panel-visibility";
  import { isReducedMotion } from "@nucleum/shell/topNav/panel-action-motion";
  import { resolveRightPanelWidthClass } from "@nucleum/shell/rightPanel/right-panel-width";

  const ComponentResolver = requireActionRenderer();

  function motionDuration(duration: number) {
    return isReducedMotion() ? 0 : duration;
  }

  let {
    action,
    isSheet = false,
    isSuspended = false
  }: {
    action: IAction;
    /** Renders the tool as a full-screen sheet, as on phones. */
    isSheet?: boolean;
    /**
     * Hides the sheet without unmounting its tool while a layer opened over
     * it is shown, so the tool keeps its state until that layer closes.
     */
    isSuspended?: boolean;
  } = $props();

  const visibility = writable(untrack(() => !isSuspended));
  provideRightPanelVisibility(visibility);
  $effect(() => visibility.set(!isSuspended));

  const sheetAttributes = $derived(
    isSheet
      ? {
          "data-testid": "right-panel-sheet",
          role: "dialog",
          "aria-modal": "true" as const,
          "aria-label": action.label ?? action.action,
          tabindex: -1
        }
      : {}
  );

  /**
   * Traps keyboard focus in `node` while `isActive`, so the same element can
   * switch between the sheet and the panel without being remounted. Leaving
   * the sheet releases the trap and keeps focus where it is; removing the
   * sheet returns focus to the element that first opened it, even after it
   * was suspended under an overlay and trapped again.
   */
  function trapFocusWhile(node: HTMLElement, isActive: boolean) {
    let opener: HTMLElement | undefined;
    const start = () => {
      const started = focusTrap(node, { opener });
      opener = started.opener;
      return started;
    };
    let trap = isActive ? start() : undefined;
    return {
      update(next: boolean) {
        if (next && !trap) trap = start();
        if (!next && trap) {
          trap.release();
          trap = undefined;
        }
      },
      destroy() {
        trap?.destroy();
      }
    };
  }
</script>

<div
  class={isSheet
    ? "fixed inset-0 z-50 flex flex-col w-full h-full bg-bgs2 outline-none"
    : cn(
        "flex justify-center items-center h-full bg-bgs2 transition-all duration-300 motion-reduce:transition-none",
        resolveRightPanelWidthClass(action.liveActionParams?.size),
        {
          "border-l border-brs3": !$context.experiments?.isEnableRoundedMain
        }
      )}
  {...sheetAttributes}
  hidden={isSuspended || undefined}
  style:display={isSuspended ? "none" : undefined}
  use:trapFocusWhile={isSheet && !isSuspended}
  in:fly={isSheet
    ? { y: 40, duration: 150, easing: quadInOut }
    : { x: 24, duration: motionDuration(150), easing: quadInOut }}
  out:fly={isSheet
    ? { duration: 0 }
    : { x: 24, duration: motionDuration(120), easing: quadInOut }}
>
  {#if isSheet}
    <div class="flex items-center justify-between min-h-12 px-2 otop:pt-12">
      <div class="px-2 text-b1 text-fgs1 truncate">
        {action.label ?? ""}
      </div>
      <button
        type="button"
        aria-label="Close"
        data-testid="right-panel-sheet-close"
        class="flex items-center justify-center h-10 w-10 rounded-full text-fgs2 active:bg-bgs3"
        onclick={() => navigation.toggleSearchParam([AccessMode.PANEL])}
      >
        <Icon icon="cross" size={Size.md} />
      </button>
    </div>
  {/if}
  {#key action.action}
    <div
      class={isSheet
        ? "flex flex-col flex-1 min-h-0"
        : "flex justify-center items-center w-full h-full"}
      in:fly={isSheet
        ? { duration: 0 }
        : { x: 16, duration: motionDuration(200), easing: quadInOut }}
    >
      <ComponentResolver path={action.path ?? action.action} />
    </div>
  {/key}
</div>
