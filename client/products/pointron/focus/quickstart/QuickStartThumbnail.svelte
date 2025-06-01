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
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { createEventDispatcher } from "svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import context from "$lib/client/stores/context.store";
  const dispatch = createEventDispatcher();

  export let item: Pick<IGoalThumb, "id" | "label" | "color" | "parent"> & {
    focus?: number;
  };
  export let layout: Layout;
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

  async function toggleSession(e: MouseEvent) {
    if (isInEditMode || e.altKey) {
      appStore.openResource(item.id, ResourceAccessMode.POP);
      return;
    }
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
    todayFocusDuration = await focusAggregates.aggregateFocusForCurrentDay({
      goalId: item.id
    });
  }

  async function unPin(e: any) {
    e.stopPropagation();
    await goalStore.modify(item.id, { isPinnedForQuickFocus: false });
    toasts.success(`Goal **${item.label}** unpinned from quick focus`);
    dispatch("unpin", item.id);
  }

  async function onGoalChanges() {
    const goal = await goalStore.selectMany(
      {
        filters: {
          id: item.id?.toString()
        }
      },
      {
        isExpand: true
      }
    );
    if (goal?.[0]) {
      item = { ...goal[0], focus: item.focus };
    }
  }

  function onTitleClick(e: MouseEvent) {
    if (!$context.isEmbed) {
      appStore.openResource(item.id, ResourceAccessMode.POP);
      e.stopPropagation();
    }
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
        "flex justify-between gap-2 h-16 min-h-[4rem] w-full items-center rounded-md  z-10",
        {
          "px-3": isActive || isInEditMode,
          "bg-ccs1": isActive && !isInEditMode,
          "bg-bgs2 notouch:hover:bg-bgs3 active:bg-bgs3 pr-3":
            !isActive && !isInEditMode,
          "border-[1.5px] border-dashed border-ccs1 notouch:hover:bg-bgs2 active:bg-bgs2":
            isInEditMode
        }
      )}
      color={item.color}
      on:click={toggleSession}
    >
      <div class="flex gap-2 items-center h-full flex-1 min-w-0">
        {#if !isActive && !isInEditMode}
          <div
            class={cn("w-0.5 h-8 ml-0.5 rounded-full", {
              "bg-ccs1": item.color,
              "bg-fgs2": !item.color
            })}
          />
        {/if}
        <div
          class={cn("flex flex-col items-start flex-1 min-w-0", {
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
          <div class="text-left flex items-center gap-2 actualQSContent w-full">
            <!-- {#if !isActive}
              <div class="w-2 h-2 bg-ccs1 rounded-full"></div>
            {/if} -->
            <div class="truncate">
              {item.label ? item.label : "Untitled"}
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
        "bg-ccs4 dark:bg-ccs3 border border-ccs2":
          !isActive && !isInEditMode && item.color,
        "bg-bgs2/60 border border-brs3":
          !isActive && !isInEditMode && !item.color,
        "border-[1.5px] border-dashed border-ccs1 dark:border-ccs2 notouch:hover:bg-bgs2 active:bg-bgs2":
          isInEditMode
      }
    )}
    color={item.color}
    on:click={toggleSession}
  >
    <div
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
            {item.label ? item.label : "Untitled"}
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
    </div>
    {#if isInEditMode}
      <UnpinAction on:click={unPin} />
    {/if}
  </CustomColorPropagator>
{/if}
<ComponentBaseLayer subscribeToRecords={[item.id]} on:change={onGoalChanges} />
