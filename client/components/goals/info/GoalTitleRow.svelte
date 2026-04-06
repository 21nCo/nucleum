<script lang="ts">
  import { mount } from "@21n/actions/mount.action";
  import { type IActiveGoalStore } from "@21n/components/goals/goal.store";
  import Breadcrumbs from "@21n/elements/breadcrumbsV2/Breadcrumbs.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import RecordStarStatusFeedback from "@21n/components/record/RecordStarStatusFeedback.svelte";
  import { AlertType, type IInlineStatus } from "@21n/types/notification.type";
  import ResourceInlineCloseButton from "@21n/elements/button/ResourceInlineCloseButton.svelte";

  let {
    goal,
    isConstrainedWidth = false,
    status = $bindable(undefined)
  }: {
    goal: IActiveGoalStore;
    isConstrainedWidth?: boolean;
    status?: IInlineStatus | undefined;
  } = $props();

  let labelEditVal = $state($goal.label);
  let inputRef = $state<TextInput | undefined>(undefined);

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
    void e;
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
              testId="goal-name-input"
              width="w-full"
              parentBackgroundIndex={2}
              onDebouncedChange={handleLabelChange}
              onSave={handleLabelSave}
              onEnter={handleLabelSave}
              onCancel={() => {
                goal.toggleEditMode(false);
                labelEditVal = "";
              }}
            />
          </span>
        </div>
      {:else}
        <button
          class="w-full"
          onclick={() => {
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
    {#if isConstrainedWidth}
      <ResourceInlineCloseButton
        accessMode={$goal.accessMode}
        additionalAccessModes={[AccessMode.POP]}
        parentBgIndex={2}
        id={$goal.id}
      />
    {/if}
  </div>
</div>
