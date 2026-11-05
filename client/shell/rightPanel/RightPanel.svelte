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

  const ComponentResolver = requireActionRenderer();

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
   * sheet returns focus to its opener.
   */
  function trapFocusWhile(node: HTMLElement, isActive: boolean) {
    let trap = isActive ? focusTrap(node) : undefined;
    return {
      update(next: boolean) {
        if (next && !trap) trap = focusTrap(node);
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
        "flex justify-center items-center h-full bg-bgs2 transition-all duration-300",
        {
          "min-w-96 w-96 2k:min-w-128 2k:w-128":
            action.liveActionParams?.size === Size.sm,
          "min-w-[32rem] w-[32rem] 2k:min-w-1/2 2k:w-1/2":
            !action.liveActionParams?.size ||
            action.liveActionParams?.size === Size.md,
          "min-w-[36rem] w-[36rem] 2k:min-w-1/2 2k:w-1/2":
            action.liveActionParams?.size === Size.lg,
          "min-w-1/2 w-1/2 2k:min-w-1/2 2k:w-1/2":
            action.liveActionParams?.size === Size.xl,
          "border-r border-brs3": !$context.experiments?.isEnableRoundedMain
        }
      )}
  {...sheetAttributes}
  hidden={isSuspended || undefined}
  style:display={isSuspended ? "none" : undefined}
  use:trapFocusWhile={isSheet && !isSuspended}
  in:fly={isSheet
    ? { y: 40, duration: 150, easing: quadInOut }
    : { x: -10, duration: 100, easing: quadInOut }}
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
  <div class={isSheet ? "flex flex-col flex-1 min-h-0" : "contents"}>
    <ComponentResolver path={action.path ?? action.action} />
  </div>
</div>
