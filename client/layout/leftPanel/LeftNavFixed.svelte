<script lang="ts">
  import AppMenuSwitcher from "@21n/layout/leftPanel/appMenuSwitcher/AppMenuSwitcher.svelte";
  import { LayoutContext } from "@21n/types/layout.type";
  import { Size } from "@21n/types/size.enum";
  import LeftBottomBar from "@21n/layout/leftPanel/LeftBottomBar.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { popover, tooltip } from "@21n/actions/popover.action";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import LeftNavSettingsPopover from "@21n/layout/leftPanel/LeftNavSettingsPopover.svelte";
  import { Placement } from "@21n/types/direction.enum";
  import Icon from "@21n/elements/Icon.svelte";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import { onMount } from "svelte";
  import { appStore } from "@21n/stores/app.store";
  import OfflineStatusMessage from "@21n/elements/feedback/OfflineStatusMessage.svelte";
  export let isRounded = false;
  const dev_mixedPanel = false;
  let isHideMenuLabels = uiState.getState(UIState.hideLeftNavMenuLabels, {
    scope: UIStateScope.DAP
  });

  onMount(() => {
    const unsubscribe = uiState.subscribe(() => {
      isHideMenuLabels = uiState.getState(UIState.hideLeftNavMenuLabels, {
        scope: UIStateScope.DAP
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  });
</script>

<div
  class={cn(
    "leftnav flex justify-center items-center h-full",
    !$appStore.currentComponent?.panel && {
      // "w-[5.5rem] min-w-[5.5rem]": !isHideMenuLabels,
      // "w-[3.5rem] min-w-[3.5rem]": isHideMenuLabels,
      "ml-2": isRounded,
      "border--r border-r-brs2": !isRounded
    }
  )}
>
  <div
    class={cn(
      "flex items-center justify-center h-full w-full bg-bgs2",
      $appStore.currentComponent?.panel && {
        "rounded-lg border-none": isRounded,
        "border-r border-bgs4": !isRounded
      }
    )}
  >
    <div
      class={cn(
        "flex flex-col items-center justify-between overflow-auto bg-bgs2",
        {
          "w-[5.5rem] min-w-[5.5rem]": !isHideMenuLabels,
          "w-[3.5rem] min-w-[3.5rem]": isHideMenuLabels
        },
        (!dev_mixedPanel || !$appStore.currentComponent?.panel) && {
          "rounded-lg border-none": isRounded,
          "border-r border-bgs4": !isRounded
        }
      )}
      style={isRounded ? "height: calc(100% - 1rem);" : "height:100%"}
    >
      <div class="w-full flex flex-col gap-8 overflow-auto">
        <div
          class="w-full flex justify-center transition-opacity duration-200 py-2"
        >
          <!--  -->
        </div>
        <div
          class={cn("flex flex-col gap-3 items-center w-full overflow-auto", {
            "p-2": !isHideMenuLabels
          })}
        >
          <AppMenuSwitcher
            parentBackgroundIndex={1}
            layoutContext={LayoutContext.THIN_WITH_LABEL}
          />
          <div
            class="flex justify-center items-center w-full mt-2"
            use:popover={{
              content: LeftNavSettingsPopover,
              id: "leftnav-settings-popover",
              placement: Placement.Right,
              triggerMethod: [PopoverTriggerMethod.CLICK],
              offsetInPx: 10
            }}
            use:tooltip={{
              text: "Menu settings"
            }}
          >
            <button
              class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-bgs3 transition-colors duration-200"
            >
              <Icon
                icon="more-outline-horizontal"
                size={Size.md}
                class="text-fgs3"
              />
            </button>
          </div>
        </div>
      </div>
      <div class="w-full flex flex-col gap-2 items-center">
        <OfflineStatusMessage isIconOnly={true} />
        <!-- <LeftNavCommandAction isInThinMode={true} size={Size.lg} /> -->
        <LeftBottomBar {isRounded} />
      </div>
    </div>
    <slot name="panel" />
  </div>
</div>
