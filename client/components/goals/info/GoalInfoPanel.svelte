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
    currentFocusItem,
    focusItemsStore
  } from "$lib/client/products/pointron/focus/session.store";
  import type { IMarkdown } from "$lib/client/components/markdown/md.type";
  import { isEmptyMd } from "../../markdown/markdown.utils";
  import GoalInfoEditControl from "./GoalInfoEditControl.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import { userPreferences } from "../../settings/userPreferences.store";
  import { resolveIfCurrentFocusItem } from "$lib/client/products/pointron/focus/session.utils";
  import PropertiesPane from "../../collection/properties/PropertiesPane.svelte";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import { debouncer } from "$lib/client/utils/utils";
  export let goal: IActiveGoalStore;
  export let isConstrainedWidth = false;
  const dispatch = createEventDispatcher();
  function handleStatusChange(e: CustomEvent<GoalStatus>) {
    $goal.status = e.detail;
    goal.modify({
      status: e.detail
    });
  }
  $: isCurrentlyFocusing =
    $activeSession.isSessionRunning &&
    resolveIfCurrentFocusItem($focusItemsStore, goal.id, $currentFocusItem);

  async function onDescriptionChange(e: CustomEvent) {
    const desc = e.detail?.md;
    if (!desc) return;
    debouncedDescriptionPersist(desc);
  }

  const debouncedDescriptionPersist = debouncer((desc: any) => {
    goal.modify({
      description: desc
    });
  }, 1000);
</script>

{#if $goal.isInEditMode}
  <button
    class="flex gap-1 w-full h-12 bg-ass1 text-abg items-center justify-center rounded-md hover:brightness-110"
    on:click={() => {
      goal.toggleEditMode(false);
    }}
  >
    <Icon icon="ph:x" size={Size.sm} class="text-abg" />
    <span> Close edit mode </span>
  </button>
{/if}
<div
  class={cn("relative flex flex-col gap-6 h-full", {
    "rounded-md p-3 h-full": isConstrainedWidth
  })}
>
  <div class="flex flex-col gap-2">
    {#if !isConstrainedWidth}
      <GoalTitleRow {goal} />
    {/if}
    <div class="flex flex-col gap-1">
      {#if isConstrainedWidth}
        <span class="text-b2 text-fgs3">Collections</span>
      {/if}
      {#if $goal.isInEditMode}
        <div class="grid grid-cols-2 gap-2 h-20 my-4">
          <GoalInfoEditControl {goal} control="color" />
          <GoalInfoEditControl {goal} control="type" />
        </div>
      {:else}
        <GoalCollectionsRow {goal} />
      {/if}
    </div>
  </div>
  <RecordStatusBanner resource={goal} />
  {#if isCurrentlyFocusing}
    Currently focusing...
  {/if}
  {#if !$goal.isInEditMode}
    <div class="flex flex-col gap-1">
      <span class="text-b2 text-fgs3">Status</span>
      <GoalStatusSwitcher
        status={$goal.status}
        on:change={handleStatusChange}
      />
    </div>
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
  <div class="text-fgs3 text-b3 mx-auto mt-auto userdata">
    Created: {formatDatetime($userPreferences, $goal.createdAt)}
  </div>
</div>
