<script lang="ts">
  import { mount } from "$lib/client/actions/mount.action";
  import {
    resolveGoalContextMenu,
    type IActiveGoalStore
  } from "$lib/client/components/goals/goal.store";
  import Breadcrumbs from "$lib/client/elements/breadcrumbsV2/Breadcrumbs.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { ResourceAccessPoint } from "../../flux/resourceStores/resource.type";
  import RecordStarStatusFeedback from "../../record/RecordStarStatusFeedback.svelte";
  import {
    AlertType,
    type IInlineStatus
  } from "$lib/client/types/notification.type";
  import { ButtonStyle } from "$lib/client/types/button.type";
  export let goal: IActiveGoalStore;
  export let isConstrainedWidth = false;
  export let status: IInlineStatus | undefined = undefined;
  let labelEditVal = $goal.label;
  let inputRef: TextInput;
  function resolveBreadcrumbs() {
    if (!$goal.parent) return [];
    const parentItems = $goal.parent?.map((p) => ({
      label: p.label,
      resourceId: p.id?.toString()
    }));
    if (parentItems && parentItems.length > 0) {
      parentItems.push({
        label: $goal.label,
        resourceId: $goal.id?.toString()
      });
    }
    return parentItems;
  }

  async function handleLabelChange(e: CustomEvent<string>) {
    status = {
      message: "Saving...",
      type: AlertType.PROGRESS
    };
    const result = await goal.modify({
      label: e.detail
    });
    if (!result || result.error) {
      status = {
        message: "Failed to save goal name",
        type: AlertType.ERROR
      };
    } else {
      status = {
        message: "Goal name saved",
        type: AlertType.SUCCESS
      };
    }
  }

  function handleLabelSave(e: any) {
    $goal.label = labelEditVal;
    goal.modify({
      label: labelEditVal
    });
    labelEditVal = "";
    goal.toggleEditMode(false);
  }
</script>

<div
  class={cn("flex flex-col items-center gap-1 userdata", {
    "px-3 lp:px-6 pt-2": isConstrainedWidth
  })}
>
  <!-- <Icon icon={resolveTaskTypeIcon($task.type)} class="text-fgs3" /> -->
  <div class="w-full flex items-center justify-between gap-1">
    <div class="flex flex-col flex-1 min-w-0">
      {#if !$goal.isInEditMode}
        <Breadcrumbs items={resolveBreadcrumbs()} />
      {/if}
      {#if $goal.isInEditMode}
        <div
          class="flex items-center gap-2 w-full"
          use:mount={() => {
            labelEditVal = $goal.label;
            inputRef?.focus();
          }}
        >
          <span class="flex-1">
            <TextInput
              bind:this={inputRef}
              bind:value={labelEditVal}
              placeholder="Enter goal name"
              width="w-full"
              parentBackgroundIndex={2}
              on:debouncedChange={handleLabelChange}
              on:save={handleLabelSave}
              on:enter={handleLabelSave}
              on:cancel={() => {
                goal.toggleEditMode(false);
                labelEditVal = "";
              }}
            />
          </span>
        </div>
      {:else}
        <button
          class="w-full"
          on:click={() => {
            goal.toggleEditMode(true);
            labelEditVal = $goal.label;
          }}
        >
          <div class="flex items-center gap-2 w-full">
            <h1 class="text-left text-h4 lp:text-h3 font-medium text-ccs1-fgs1">
              {$goal.label ? $goal.label : "Untitled"}
            </h1>
            <RecordStarStatusFeedback isStarred={$goal.isStarred} />
          </div>
        </button>
      {/if}
    </div>
    <ContextMenuAction
      menuResolver={() =>
        resolveGoalContextMenu($goal, ResourceAccessPoint.SELF)}
      position={Placement.BottomCenter}
      id="taskContextMenu"
      size={Size.lg}
      icon="more-outline-horizontal"
      actionBgSize={isConstrainedWidth ? Size.sm : undefined}
    />
    {#if isConstrainedWidth}
      <Button
        icon="cross"
        style={ButtonStyle.OUTLINED}
        parentBgIndex={2}
        on:click={() => {
          appStore.closeResource({ id: $goal.id });
        }}
      />
    {/if}
  </div>
</div>
