<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { type IActiveGoalStore } from "@21n/components/goals/goal.store";
  import GoalCollectionsRow from "@21n/components/goals/GoalCollectionsRow.svelte";
  import Markdown from "@21n/components/markdown/Markdown.svelte";
  import GoalTitleRow from "@21n/components/goals/info/GoalTitleRow.svelte";
  import GoalStatusSwitcher from "@21n/components/goals/status/GoalStatusSwitcher.svelte";
  import { GoalStatus, GoalType } from "@21n/components/goals/goal.type";
  import { cn } from "@21n/utils/ui.utils";
  import TimelineCard from "@21n/components/goals/info/TimelineCard.svelte";
  import RecordStatusBanner from "@21n/components/record/RecordStatusBanner.svelte";
  import {
    activeSession,
    currentFocusItem
  } from "@21n/products/pointron/focus/session.store";
  import { isEmptyMd } from "@21n/components/markdown/markdown.utils";
  import GoalInfoEditControl from "@21n/components/goals/info/GoalInfoEditControl.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { formatDatetime } from "@21n/utils/time.utils";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import PropertiesPane from "@21n/components/collection/properties/PropertiesPane.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { debouncer } from "@21n/utils/utils";
  import { SessionUIContext } from "@21n/types/pointron/session.type";
  import ControlBar from "@21n/products/pointron/focus/elements/controls/ControlBar.svelte";
  import FocusPlayerTimeText from "@21n/products/pointron/focus/player/FocusPlayerTimeText.svelte";
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import InlineFeedbackText from "@21n/extensions/clipper/InlineFeedbackText.svelte";
  import { AlertType, type IInlineStatus } from "@21n/types/notification.type";
  import { appStore } from "@21n/stores/app.store";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  export let goal: IActiveGoalStore;
  export let isConstrainedWidth = false;
  export let status: IInlineStatus | undefined = undefined;
  const dispatch = createEventDispatcher();
  function handleStatusChange(e: CustomEvent<GoalStatus>) {
    $goal.status = e.detail;
    goal.modify({
      status: e.detail
    });
  }
  $: isCurrentlyFocusing = activeSession.isCurrentFocusItem(
    goal.id,
    $currentFocusItem
  );

  async function onDescriptionChange(e: CustomEvent) {
    status = {
      message: "Saving...",
      type: AlertType.PROGRESS
    };
    const desc = e.detail?.md;
    if (!desc) return;
    debouncedDescriptionPersist(desc);
  }

  const debouncedDescriptionPersist = debouncer((desc: any) => {
    goal.modify({
      description: desc
    });
    status = {
      message: "Description saved",
      type: AlertType.SUCCESS
    };
  }, 1000);
</script>

<div
  class={cn("relative flex flex-col gap-6 ", {
    "rounded-md p-3": isConstrainedWidth,
    "pt-3": $goal.isInEditMode
  })}
>
  {#if ($goal.description && !isEmptyMd($goal.description.blocks)) || $goal.isInEditMode}
    <div>
      {#if $goal.isInEditMode}
        <span class="text-b2 text-fgs3">Description</span>
      {/if}
      <div
        class="flex flex-col gap-2 p-2 bg-bgs2 rounded-md overflow-auto userdata"
      >
        <Markdown
          md={$goal.description}
          params={{
            placeholder: "Type...",
            isPreventFocusOnLoad: true
          }}
          on:change={onDescriptionChange}
        />
      </div>
    </div>
  {/if}
  {#if $goal.isInEditMode || isConstrainedWidth}
    <div class="flex flex-col gap-2">
      <div class="flex flex-col gap-1">
        {#if isConstrainedWidth}
          <span class="text-b2 text-fgs3">Collections</span>
        {/if}
        {#if $goal.isInEditMode}
          <div class="grid grid-cols-2 gap-2 h-20 my-4">
            <GoalInfoEditControl {goal} control="color" bind:status />
            <GoalInfoEditControl {goal} control="type" bind:status />
          </div>
        {:else if isConstrainedWidth}
          <GoalCollectionsRow {goal} />
        {/if}
      </div>
    </div>
  {/if}
  <RecordStatusBanner resource={goal} />
  {#if isCurrentlyFocusing}
    <button
      class="flex items-center w-full justify-between gap-4 border border-brs3 p-3 rounded-md hover:bg-bgs2"
      on:click={() => {
        appStore.runAction(PointronAction.FOCUS);
      }}
    >
      <FocusPlayerTimeText context={SessionUIContext.GOAL_PAGE} />
      <ControlBar context={SessionUIContext.PIP} />
    </button>
  {/if}
  {#if !$goal.isInEditMode}
    <div class="flex flex-col gap-1">
      <span class="text-b2 text-fgs3">Status</span>
      <GoalStatusSwitcher
        status={$goal.status}
        on:change={handleStatusChange}
      />
    </div>
    {#if $goal.status === GoalStatus.COMPLETED}
      <InlineInfoBanner
        icon="check-circle"
        isIconFilled={true}
        content="This goal is marked as completed. It will not appear in focus items search results."
      />
    {/if}
  {/if}
  {#if $goal.type === GoalType.DEFINITE}
    <TimelineCard {goal} />
  {/if}
  {#if $goal.types && $goal.types.length > 0}
    <PropertiesPane
      item={goal}
      resource={Resource.goal}
      parentBgIndex={isConstrainedWidth ? 1 : 2}
      isVisibleProps={true}
      on:showAll={() => {
        dispatch("showAllProperties");
      }}
    />
  {/if}
  <InlineFeedbackText bind:feedback={status} />
  {#if $goal.createdAt}
    <div class="text-fgs3 text-b3 mx-auto mt-auto userdata">
      Created: {formatDatetime($userPreferences, $goal.createdAt)}
    </div>
  {/if}
</div>
