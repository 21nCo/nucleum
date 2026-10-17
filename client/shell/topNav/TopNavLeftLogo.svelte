<svelte:options runes={true} />

<script lang="ts">
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import type { Snippet } from "svelte";
  import { cn } from "@21n/ui/environment/presentation";

  import { tooltip } from "@21n/ui/actions/popover.action";
  import { Action } from "@nucleum/client/config/action.enum";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import { onMount } from "svelte";
  import context from "@nucleum/client/runtime/context.store";

  import Icon from "@21n/ui/elements/Icon.svelte";
  let {
    action = undefined,
    isRenderProfilePicture = false,
    isSubscriber = false,
    callback = undefined,
    logo = undefined,
    profilePicture = undefined
  }: {
    action?: string;
    isRenderProfilePicture?: boolean;
    isSubscriber?: boolean;
    callback?: () => void;
    /** Product brand logo slot rendered when no action icon applies. */
    logo?: Snippet;
    /** Account avatar slot; receives the render context (e.g. "topbar"). */
    profilePicture?: Snippet<
      [
        context:
          | "cmd-page"
          | "cp-profile"
          | "account-settings"
          | "topbar"
          | "mobile-topbar"
      ]
    >;
  } = $props();

  let isHideMenuLabels = $state(
    uiState.getState(UIState.hideLeftNavMenuLabels, {
      scope: UIStateScope.DAP
    })
  );

  onMount(() => {
    const unsubscribe = uiState.subscribe((x) => {
      isHideMenuLabels = uiState.getState(UIState.hideLeftNavMenuLabels, {
        scope: UIStateScope.DAP
      });
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  });

</script>

<button
  data-testid="topnav-account-settings"
  class={cn(
    "group flex items-center h-full w-fit hover:bg-bgs3-striped",
    !action && {
      "px-[0.72rem]": isHideMenuLabels,
      "px-[1.72rem]": !isHideMenuLabels,
      "border-r border-brs3": !$context.experiments?.isEnableRoundedMain
    },
    action && {
      "px-[1.08rem]": isHideMenuLabels,
      "px-[2.08rem]": !isHideMenuLabels,
      "border-r border-brs3": !$context.experiments?.isEnableRoundedMain
    }
  )}
  onclick={() => {
    if (callback) {
      callback();
    } else {
      requireCommandHost().runAction(action ?? Action.SETTINGS);
    }
  }}
>
  {#if isRenderProfilePicture}
    <div class="px-1">
      <div
        class={cn("flex items-center gap-2 rounded-full overflow-hidden", {
          "outline outline-ags1 group-hover:brightness-110": isSubscriber,
          "hover:outline group-hover:outline-brs3": !isSubscriber
        })}
        use:tooltip={{
          text: "Account & settings"
        }}
      >
        {@render profilePicture?.("topbar")}
      </div>
    </div>
  {:else if action}
    <div class="flex items-center justify-center">
      <Icon icon={"settings"} />
    </div>
  {:else}
    <div class="opacity-50">
      {@render logo?.()}
    </div>
  {/if}
</button>
