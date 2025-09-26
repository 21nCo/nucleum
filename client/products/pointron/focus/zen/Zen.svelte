<script lang="ts">
  import { startTouch, moveTouch } from "$lib/client/utils/touchGesture";
  import { activeSession } from "$lib/client/products/pointron/focus/session.store";
  import { SessionUIContext } from "$lib/client/types/pointron/session.type";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import SessionTimeText from "../elements/sessionTimeText/SessionTimeText.svelte";
  import ControlBar from "../elements/controls/ControlBar.svelte";
  import FocusItemList from "../elements/focusitem/FocusItemList.svelte";
  import IntervalBar from "../elements/intervalbar/IntervalBar.svelte";
  import FocusItemsHeading from "./FocusItemsHeading.svelte";
  import TimeleftIndicator from "./timeleftindicator/TimeleftIndicator.svelte";
  import { SessionType } from "$lib/client/products/pointron/logs/log.type";
  import { AppSkin } from "$lib/client/types/appearance.type";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import Extras from "../elements/controls/Extras.svelte";
  import SessionNotes from "../notes/SessionNotes.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { fullScreen } from "$lib/client/components/modal/modal.store";
  import { page } from "$app/stores";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";

  export let isInline: boolean = false;
  let layout: number = 1;
  let isShowTimeLeftOnMobile: boolean = false;
  $: fullScreenFocusIsEnabled =
    $page?.url?.searchParams?.get(ResourceAccessMode.FULL) ===
    PointronAction.FULL_SCREEN_FOCUS;
  $: isExtraLargeScreen = $view.landscapiness > 1.7 && $view.scale > 1.8;
</script>

<!-- {#snippet focusItemsHeading()}
<FocusItemsHeading {isInEditMode} on:click={onEditClicked} />
{/snippet} -->

{#if $view.isPortrait}
  <div
    on:touchstart|stopPropagation={startTouch}
    on:touchmove|stopPropagation={() =>
      moveTouch(
        event,
        undefined,
        undefined,
        fullScreen.hide,
        undefined,
        undefined
      )}
    class="flex flex-col w-full h-full px-4 py-8 glassthick bg-bgs1 otop:pt-12"
  >
    <div class="flex flex-col gap-6 flex-grow w-full items-center">
      {#if !$isInEditMode}
        <IntervalBar />
        <div
          class="flex flex-col w-full items-center transition-all duration-300"
        >
          <SessionTimeText size={Size.sm} />
          {#if $activeSession.type != SessionType.COUNTUP && isShowTimeLeftOnMobile}
            <div class="w-full px-6">
              <TimeleftIndicator parentBgIndex={0} />
            </div>
          {/if}
        </div>
      {/if}
      <div
        id="focusItems"
        on:touchstart|stopPropagation={startTouch}
        class="flex flex-col flex-grow gap-2 p-2 w-full h-64 overflow-auto styledscroll rounded-md bg-bgs1 transition-all duration-300"
      >
        <FocusItemsHeading />
        <FocusItemList isInEditMode={$isInEditMode} />
      </div>
    </div>
    {#if !isInline && !$isInEditMode}
      <div class="flex flex-col gap-12">
        <div class="flex w-full justify-center">
          <ControlBar />
        </div>
        <div class="flex justify-center">
          <Extras isInFullScreen={!isInline} />
        </div>
      </div>
    {/if}
  </div>
{:else if layout == 1}
  {@const parentBgIndex = isInline && !$activeSession.isQuickStartOn ? 1 : 2}
  <div
    class="flex w-full h-full {$userPreferences?.appearance?.skin ===
    AppSkin.Glassy
      ? 'glassthick'
      : ''}"
    aria-roledescription="zen mode"
  >
    <div
      class={cn("flex flex-col items-center justify-center flex-grow ", {
        "bg-bgs1": parentBgIndex === 1,
        "bg-bgs2": !isInline || $activeSession.isQuickStartOn
      })}
    >
      <div class="flex flex-col justify-between w-full h-full py-6 px-10">
        <IntervalBar
          context={isInline
            ? SessionUIContext.DEFAULT
            : SessionUIContext.ZEN_ON_DESKTOP}
        />
        <div class="flex flex-col w-full items-center px-4 lg:px-8 xl:px-20">
          <SessionTimeText parentBackgroundIndex={parentBgIndex} />
          {#if $activeSession.type != SessionType.COUNTUP}
            <TimeleftIndicator {parentBgIndex} />
          {/if}
        </div>
        <div class="flex flex-col gap-20">
          <div class="flex w-full justify-center">
            <ControlBar />
          </div>
          <div class="flex justify-center">
            <div class="w-3/4 xl:w-1/2">
              <Extras isInFullScreen={!isInline} {parentBgIndex} />
            </div>
          </div>
        </div>
      </div>
    </div>
    {#if !isInline || !$activeSession.isQuickStartOn}
      {#if isInline}
        <Divider orientation={Orientation.Vertical} />
      {/if}
      <div class="flex flex-col gap-4 pt-6 p-6 w-96 xl:w-1/3 2xl:1/4 bg-bgs1">
        <FocusItemsHeading />
        <div class="overflow-y-auto h-full">
          <FocusItemList isInEditMode={$isInEditMode} />
        </div>
      </div>
    {/if}
    {#if isExtraLargeScreen && ((isInline && !fullScreenFocusIsEnabled) || !isInline)}
      <div class="w-1/4 2k:min-w-96 p-4">
        <SessionNotes />
      </div>
    {/if}
  </div>
{/if}
