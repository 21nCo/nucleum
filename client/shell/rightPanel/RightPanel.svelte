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
    isSheet = false
  }: {
    action: IAction;
    /** Renders the tool as a full-screen sheet, as on phones. */
    isSheet?: boolean;
  } = $props();
</script>

{#if isSheet}
  <div
    class="fixed inset-0 z-50 flex flex-col w-full h-full bg-bgs2 outline-none"
    data-testid="right-panel-sheet"
    role="dialog"
    aria-modal="true"
    aria-label={action.label ?? action.action}
    tabindex="-1"
    use:focusTrap
    in:fly={{ y: 40, duration: 150, easing: quadInOut }}
  >
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
    <div class="flex flex-col flex-1 min-h-0">
      <ComponentResolver path={action.path ?? action.action} />
    </div>
  </div>
{:else}
  <div
    class={cn(
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
    in:fly={{ x: -10, duration: 100, easing: quadInOut }}
  >
    <ComponentResolver path={action.path ?? action.action} />
  </div>
{/if}
