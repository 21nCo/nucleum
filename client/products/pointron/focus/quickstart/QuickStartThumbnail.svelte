<script lang="ts">
  import {
    activeSession,
    currentFocusItem
  } from "$lib/client/products/pointron/focus/session.store";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { Layout } from "$lib/client/types/layout.type";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatTime, formatSeconds } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import BreadcrumbMini from "$lib/client/elements/breadcrumb/BreadcrumbMini.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { resolveTaskFocus } from "../session.utils";
  import UnpinAction from "./actions/UnpinAction.svelte";
  import { toasts } from "$lib/client/stores/notification.store";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { goalStore } from "$lib/client/components/goals/goal.store";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { focusAggregates } from "../../analytics/analytics.store";
  export let item: Pick<IGoalThumb, "id" | "label" | "color" | "parent"> & {
    focus?: number;
  };
  export let layout: Layout;
  export let refresh: any;
  export let isInEditMode: boolean = false;
  let isColorGoalTextExperimental = false;
  let todayFocusDuration: number | undefined = item.focus;
  let parentLabels: string[] = [];
  let focusTime: number;
  let isHovering = false;
  let isFinishingState: boolean = false;

  $: isActive =
    $currentFocusItem &&
    isSameResource(item, $currentFocusItem) &&
    $activeSession.isQuickStartOn &&
    $activeSession.isSessionRunning &&
    !isFinishingState;
  $: if (isActive) {
    focusTime = resolveTaskFocus(
      $activeSession.intervals,
      undefined,
      $currentFocusItem?.start
    );
  }

  onMount(async () => {
    if (item.parent && item.parent?.length > 0)
      parentLabels = item.parent.map((x: any) => x.label) ?? [];
  });

  async function toggleSession() {
    if (isInEditMode) return;
    if (isActive) {
      isFinishingState = true;
      await activeSession.finishSession({ isClose: true });
      await refreshFocus();
      isFinishingState = false;
    } else {
      if ($activeSession.isSessionRunning)
        await activeSession.finishSession({ isQuickStartSwitch: true });
      await activeSession.quickStart(item.id);
    }
  }

  async function refreshFocus() {
    todayFocusDuration = await focusAggregates.aggregateFocusForADay({
      day: new Date(),
      goalId: item.id
    });
  }

  async function unPin() {
    await goalStore.modify(item.id, { isPinnedForQuickFocus: false });
    toasts.success(`Goal **${item.label}** unpinned from quick focus`);
    refresh();
  }
</script>

{#if layout === Layout.LIST}
  <button
    id={item.id.toString()}
    use:hoverable={{
      onHover: (val) => {
        isHovering = val;
      }
    }}
    class={cn("relative cursor-pointer userdata", {})}
  >
    <CustomColorPropagator
      class={cn(
        "flex justify-between h-16 min-h-[4rem] w-full items-center rounded-md  z-10",
        {
          "px-3": isActive || isInEditMode,
          "bg-ccs1": isActive && !isInEditMode,
          "bg-bgs2 hover:bg-bgs3 pr-3": !isActive && !isInEditMode,
          "border-[1.5px] border-dashed border-ccs1 hover:bg-bgs2": isInEditMode
        }
      )}
      color={item.color}
      on:click={toggleSession}
    >
      <div class="flex gap-2 items-center h-full">
        {#if !isActive && !isInEditMode}
          <div
            class={cn("w-0.5 h-8 ml-0.5 rounded-full", {
              "bg-ccs1": item.color,
              "bg-fgs2": !item.color
            })}
          />
        {/if}
        <div
          class={cn("flex flex-col items-start", {
            "text-ccs1": !isActive && isColorGoalTextExperimental,
            "text-fgs1": !isActive
          })}
        >
          <!-- {#if parentLabels.length > 0}
            <div class="text-start text-b4 truncate actualQSContent">
              {parentLabels.slice(-2).join(" ・ ")}
            </div>
          {/if} -->
          {#key parentLabels}
            <div
              class={cn({
                "text-fgs3": !isActive
              })}
            >
              <BreadcrumbMini hierarchy={parentLabels} slice={2} />
            </div>
          {/key}
          <div
            class="font-medium text-left flex items-center gap-2 truncate actualQSContent"
          >
            <!-- {#if !isActive}
              <div class="w-2 h-2 bg-ccs1 rounded-full"></div>
            {/if} -->
            <div>
              {item.label ?? ""}
            </div>
          </div>
        </div>
      </div>

      {#if isActive && $currentFocusItem}
        <div class="flex flex-col items-end">
          <div class="flex items-center gap-1 text-b4">
            <div>
              {formatTime($userPreferences, $activeSession.start ?? new Date())}
            </div>
            <Icon icon="arrow-right-mini" isCustomBgContext={isActive} />
            <div>Now</div>
          </div>
          <div class="text-h3 leading-none">
            {formatSeconds(focusTime, TimeFormat.CLOCK)}
          </div>
        </div>
      {:else}
        <div class="text-b4">
          {isFinishingState
            ? "Finishing session..."
            : isHovering && !isInEditMode
              ? "Click to start"
              : todayFocusDuration
                ? "Today: " + formatSeconds(todayFocusDuration)
                : "Not focused today"}
        </div>
      {/if}
    </CustomColorPropagator>
    {#if isInEditMode}
      <UnpinAction on:click={unPin} />
    {/if}
  </button>
{:else}
  <!-- TODO - dark:bg-ccs3 isn't working due to bg-cc classes implementation. replacing `bg-ccs4 dark:bg-ccs3` with regular bg classes `bg-bgs1 dark:bg-bgs2` works -->
  <CustomColorPropagator
    type="button"
    class={cn(
      "relative flex rounded-md h-[4.3rem] p-2 transition-ease userdata",
      {
        "bg-ccs1 border border-ccs1": isActive && !isInEditMode,
        "bg-ccs4 dark:bg-ccs3 border border-ccs2": !isActive && !isInEditMode,
        "border-[1.5px] border-dashed border-ccs1 dark:border-ccs2 hover:bg-bgs2":
          isInEditMode
      }
    )}
    color={item.color}
    on:click={toggleSession}
  >
    <button
      use:hoverable={{
        onHover: (val) => {
          isHovering = val;
        }
      }}
      class="flex flex-col items-start w-full h-full justify-between"
    >
      <div class="flex gap-2 items-center">
        <div class="flex flex-col items-start">
          <div class="text-left text-b2 truncate w-40 md:w-40">
            {item.label ?? ""}
          </div>
        </div>
      </div>
      {#if isActive && $currentFocusItem}
        <div class="flex w-full justify-between text-h4">
          <!-- <div class="flex items-center gap-1 text-b5">
          <div>
            {formatTime($sessionStore.start ?? new Date())}
          </div>
        </div> -->
          <div class="leading-none font-medium">
            {formatSeconds(focusTime, TimeFormat.CLOCK)}
          </div>
        </div>
      {:else}
        <div class="text-b4 text-fgs2">
          {isFinishingState
            ? "Finishing session..."
            : isHovering && !isInEditMode
              ? "Click to start"
              : todayFocusDuration
                ? formatSeconds(todayFocusDuration) + " today"
                : "Not focused today"}
        </div>
      {/if}
    </button>
    {#if isInEditMode}
      <UnpinAction on:click={unPin} />
    {/if}
  </CustomColorPropagator>
{/if}
