<script lang="ts">
  import { type IActiveObjectiveStore } from "@21n/components/goals/goal.store";
  import ObjectiveCollectionsRow from "@21n/components/goals/GoalCollectionsRow.svelte";
  import Markdown from "@21n/components/markdown/Markdown.svelte";
  import ObjectiveTitleRow from "@21n/components/goals/info/GoalTitleRow.svelte";
  import ObjectiveStatusSwitcher from "@21n/components/goals/status/GoalStatusSwitcher.svelte";
  import {
    ObjectiveStatus,
    ObjectiveType,
    type ObjectiveStatusValue
  } from "@21n/components/goals/goal.type";
  import { cn } from "@21n/utils/ui.utils";
  import TimelineCard from "@21n/components/goals/info/TimelineCard.svelte";
  import {
    activeSession,
    currentFocusItem
  } from "@21n/products/pointron/focus/session.store";
  import { isEmptyMd } from "@21n/components/markdown/markdown.utils";
  import ObjectiveInfoEditControl from "@21n/components/goals/info/GoalInfoEditControl.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { formatDatetime } from "@21n/utils/time.utils";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import PropertiesPane from "@21n/components/collection/properties/PropertiesPane.svelte";
  import { Resource } from "@21n/data/datafn/resource.enum";
  import { debouncer } from "@21n/utils/utils";
  import { SessionUIContext } from "@21n/types/pointron/session.type";
  import ControlBar from "@21n/products/pointron/focus/elements/controls/ControlBar.svelte";
  import FocusPlayerTimeText from "@21n/products/pointron/focus/player/FocusPlayerTimeText.svelte";
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import InlineFeedbackText from "@21n/extensions/clipper/InlineFeedbackText.svelte";
  import { AlertType, type IInlineStatus } from "@21n/types/notification.type";
  import { appStore } from "@21n/stores/app.store";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";

  let {
    objective,
    isConstrainedWidth = false,
    status = $bindable()
  }: {
    objective: IActiveObjectiveStore;
    isConstrainedWidth?: boolean;
    status?: IInlineStatus | undefined;
  } = $props();
  function handleStatusChange(e: CustomEvent<ObjectiveStatusValue>) {
    $objective.status = e.detail;
    objective.modify({
      status: e.detail
    });
  }
  const isCurrentlyFocusing = $derived(
    activeSession.isCurrentFocusItem(objective.id, $currentFocusItem)
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
    objective.modify({
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
    "pt-3": $objective.isInEditMode
  })}
>
  {#if ($objective.description && !isEmptyMd($objective.description.blocks)) || $objective.isInEditMode}
    <div>
      {#if $objective.isInEditMode}
        <span class="text-b2 text-fgs3">Description</span>
      {/if}
      <div
        class="flex flex-col gap-2 p-2 bg-bgs2 rounded-md overflow-auto userdata"
      >
        <Markdown
          md={$objective.description}
          params={{
            placeholder: "Type...",
            isPreventFocusOnLoad: true
          }}
          onChange={onDescriptionChange}
        />
      </div>
    </div>
  {/if}
  {#if $objective.isInEditMode || isConstrainedWidth}
    <div class="flex flex-col gap-2">
      <div class="flex flex-col gap-1">
        {#if isConstrainedWidth}
          <span class="text-b2 text-fgs3">Collections</span>
        {/if}
        {#if $objective.isInEditMode}
          <div class="grid grid-cols-2 gap-2 h-20 my-4">
            <ObjectiveInfoEditControl {objective} control="color" bind:status />
            <ObjectiveInfoEditControl {objective} control="type" bind:status />
          </div>
        {:else if isConstrainedWidth}
          <ObjectiveCollectionsRow {objective} />
        {/if}
      </div>
    </div>
  {/if}
  {#if isCurrentlyFocusing}
    <button
      class="flex items-center w-full justify-between gap-4 border border-brs3 p-3 rounded-md hover:bg-bgs2"
      onclick={() => {
        appStore.runAction(PointronAction.FOCUS);
      }}
    >
      <FocusPlayerTimeText context={SessionUIContext.OBJECTIVE_PAGE} />
      <ControlBar context={SessionUIContext.PIP} />
    </button>
  {/if}
  {#if !$objective.isInEditMode}
    <div class="flex flex-col gap-1">
      <span class="text-b2 text-fgs3">Status</span>
      <ObjectiveStatusSwitcher status={$objective.status} onChange={handleStatusChange} />
    </div>
    {#if $objective.status === ObjectiveStatus.COMPLETED}
      <InlineInfoBanner
        icon="check-circle"
        isIconFilled={true}
        content="This objective is marked as completed. It will not appear in focus items search results."
      />
    {/if}
  {/if}
  {#if $objective.type === ObjectiveType.DEFINITE}
    <TimelineCard {objective} />
  {/if}
  {#if $objective.types && $objective.types.length > 0}
    <PropertiesPane
      item={objective}
      resource={Resource.objective}
      parentBgIndex={isConstrainedWidth ? 1 : 2}
      isVisibleProps={true}
    />
  {/if}
  <InlineFeedbackText bind:feedback={status} />
  {#if $objective.createdAt}
    <div class="text-fgs3 text-b3 mx-auto mt-auto userdata">
      Created: {formatDatetime($userPreferences, $objective.createdAt)}
    </div>
  {/if}
</div>
