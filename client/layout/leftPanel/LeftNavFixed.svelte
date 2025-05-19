<script lang="ts">
  import AppMenuSwitcher from "$lib/client/layout/leftPanel/appMenuSwitcher/AppMenuSwitcher.svelte";
  import { LayoutContext } from "$lib/client/types/layout.type";
  import { Size } from "$lib/client/types/size.enum";
  import LeftBottomBar from "./LeftBottomBar.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import LeftNavOfflineStatus from "./LeftNavOfflineStatus.svelte";
  import SubAtomLogo from "$lib/client/branding/SubAtomLogo.svelte";
  import TrailLeftIndicator from "../topNav/TrailLeftIndicator.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  export let isRounded = false;
</script>

<div
  class={cn(
    "leftnav flex justify-center items-center h-full w-[5.5rem] min-w-[5.5rem]",
    {
      "ml-2": isRounded,
      "border--r border-r-brs2": !isRounded
    }
  )}
>
  <div
    class={cn(
      "flex flex-col pt-4 gap-8 items-center justify-between overflow-auto w-full bg-bgs2",
      {
        "rounded-lg border-none": isRounded,
        "border-r border-bgs4": !isRounded
      }
    )}
    style={isRounded ? "height: calc(100% - 1rem);" : "height:100%"}
  >
    <div class="w-full flex flex-col gap-8 overflow-auto">
      <div class="w-full flex justify-center opacity-30">
        <!-- <Button
          icon="ph:magnifying-glass-light"
          parentBgIndex={2}
          size={Size.lg}
          on:click={() => appStore.runAction(Action.GLOBAL_SEARCH)}
        /> -->
        <SubAtomLogo />
      </div>
      <!-- <TrailLeftIndicator orientation={Orientation.Vertical} /> -->
      <div class="flex flex-col gap-8 items-center w-full p-2 overflow-auto">
        <AppMenuSwitcher
          parentBackgroundIndex={1}
          layoutContext={LayoutContext.THIN_WITH_LABEL}
        />
      </div>
    </div>
    <div class="w-full flex flex-col gap-2 items-center">
      <LeftNavOfflineStatus isInThinMode={true} />
      <!-- <LeftNavCommandAction isInThinMode={true} size={Size.lg} /> -->
      <LeftBottomBar isInThinMode={true} {isRounded} size={Size.lg} />
    </div>
  </div>
</div>
