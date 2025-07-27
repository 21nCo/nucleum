<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { type IActiveGoalStore } from "$lib/client/components/goals/goal.store";
  import GoalCollectionsRow from "../GoalCollectionsRow.svelte";
  import Markdown from "$lib/client/components/markdown/Markdown.svelte";
  import GoalTitleRow from "./GoalTitleRow.svelte";
  import GoalStatusSwitcher from "../status/GoalStatusSwitcher.svelte";
  import { GoalStatus, GoalType } from "../goal.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import TimelineCard from "./TimelineCard.svelte";
  import RecordStatusBanner from "../../record/RecordStatusBanner.svelte";
  import {
    activeSession,
    currentFocusItem
  } from "$lib/client/products/pointron/focus/session.store";
  import { isEmptyMd } from "../../markdown/markdown.utils";
  import GoalInfoEditControl from "./GoalInfoEditControl.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import { userPreferences } from "../../settings/userPreferences.store";
  import PropertiesPane from "../../collection/properties/PropertiesPane.svelte";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import { debouncer } from "$lib/client/utils/utils";
  import { SessionUIContext } from "$lib/client/types/pointron/session.type";
  import ControlBar from "$lib/client/products/pointron/focus/elements/controls/ControlBar.svelte";
  import FocusPlayerTimeText from "$lib/client/products/pointron/focus/player/FocusPlayerTimeText.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import InlineFeedbackText from "$lib/client/extensions/clipper/InlineFeedbackText.svelte";
  import {
    AlertType,
    type IInlineStatus
  } from "$lib/client/types/notification.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
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

{#if $goal.isInEditMode}
  <button
    class="flex gap-1 w-full h-12 min-h-12 bg-ass1 text-abg items-center justify-center rounded-md hover:brightness-110"
    on:click={() => {
      goal.toggleEditMode(false);
    }}
  >
    <Icon icon="ph:x" size={Size.sm} class="text-abg" />
    <span> Close edit mode </span>
  </button>
{/if}
<div
  class={cn("relative flex flex-col gap-6 ", {
    "rounded-md p-3": isConstrainedWidth
  })}
>
  <div class="flex flex-col gap-2">
    {#if !isConstrainedWidth}
      <GoalTitleRow {goal} bind:status />
    {/if}
    <div class="flex flex-col gap-1">
      {#if isConstrainedWidth}
        <span class="text-b2 text-fgs3">Collections</span>
      {/if}
      {#if $goal.isInEditMode}
        <div class="grid grid-cols-2 gap-2 h-20 my-4">
          <GoalInfoEditControl {goal} control="color" bind:status />
          <GoalInfoEditControl {goal} control="type" bind:status />
        </div>
      {:else}
        <GoalCollectionsRow {goal} />
      {/if}
    </div>
  </div>
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
        icon="ph:check-circle-fill"
        content="This goal is marked as completed. It will not appear in focus items search results."
      />
    {/if}
  {/if}
  {#if $goal.type === GoalType.DEFINITE}
    <TimelineCard {goal} />
  {/if}

  {#if ($goal.description && !isEmptyMd($goal.description.blocks)) || $goal.isInEditMode}
    <div>
      <span class="text-b2 text-fgs3">Description</span>
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
  {#if $goal.types && $goal.types.length > 0}
    <PropertiesPane
      item={goal}
      resource={Resource.goal}
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
